"use client";
import { useEffect, useRef } from "react";
import { SpinLattice } from "@/services/spin-lattice";
import { simulateMetropoliseSweepLattice } from "@/services/metropolis";
import { renderSliceToImageData, drawTiledOnCanvas, SliceAxis } from "@/services/canvas-lattice";
import { loadWasm } from "@/services/wasm-loader";
import type { WasmLattice } from "@/services/wasm-loader";

const FRAMES_PER_SWEEP = 6; // one full lattice sweep every 6 frames (~10/s at 60 fps)
const SF_SWEEP_INTERVAL = 5; // recompute S(k) path every N sweeps
const ENERGY_BUFFER_SIZE = 512;

function sampleStdDev(arr: Float32Array, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += arr[i];
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) sq += (arr[i] - mean) ** 2;
  return Math.sqrt(sq / (n - 1));
}

// C(r) ≈ f(r)/f(0), f(r) = Σ_{j=0}^{steps} ⟨S(k_j)/N³⟩·cos(2π·nx_j·r/N)
// Uses Γ→X segment only; cost O(steps·rMax) per call (~2k ops for N=128).
function computeCorrelationData(
  skSum: Float32Array,
  count: number,
  pathDef: { nx: number; ny: number; nz: number }[],
  N: number
): Float32Array | null {
  const steps = Math.max(4, Math.floor(Math.floor(N / 2) / 2));
  const rMax = Math.floor(N / 2);
  const twoPiOverN = 2 * Math.PI / N;
  let f0 = 0;
  for (let j = 0; j <= steps; j++) f0 += skSum[j] / count;
  if (f0 <= 0) return null;
  const result = new Float32Array(rMax + 1);
  result[0] = 1.0;
  for (let r = 1; r <= rMax; r++) {
    let f = 0;
    for (let j = 0; j <= steps; j++) f += (skSum[j] / count) * Math.cos(twoPiOverN * pathDef[j].nx * r);
    result[r] = f / f0;
  }
  return result;
}

// Ornstein-Zernike fit around the S(k) peak: 1/S(k) = α + β·|k−k₀|²  →  ξ = √(β/α).
// Finds the peak in the interior of the path (skips Γ endpoints), then fits ±WIN points.
// For FM (peak at or near Γ, index ≤1): falls back to the Γ→X small-k OZ fit instead,
// because index 0 can be a Bragg peak in the ordered phase.
// Returns ξ in lattice spacings, or null when the fit is degenerate.
function fitCorrelationLength(
  skSum: Float32Array,
  count: number,
  pathDef: { nx: number; ny: number; nz: number }[],
  N: number
): number | null {
  const nPts = pathDef.length;
  const steps = Math.max(4, Math.floor(Math.floor(N / 2) / 2));
  const kFactor = (2 * Math.PI / N) ** 2;

  // Find peak, excluding index 0 (first Γ) which can be a FM Bragg peak.
  let peakIdx = 1;
  let peakVal = skSum[1] / count;
  for (let i = 2; i < nPts; i++) {
    const v = skSum[i] / count;
    if (v > peakVal) { peakVal = v; peakIdx = i; }
  }

  if (peakIdx <= 1) {
    // FM-like: peak is right at/near Γ. Use small-k OZ fit on Γ→X (indices 1..steps).
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0, n = 0;
    for (let i = 1; i <= steps; i++) {
      const s = skSum[i] / count;
      if (!(s > 0)) continue;
      const x = kFactor * pathDef[i].nx ** 2;
      const y = 1 / s;
      sumX += x; sumY += y; sumXX += x * x; sumXY += x * y; n++;
    }
    if (n < 2) return null;
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-30) return null;
    const alpha = (sumY * sumXX - sumX * sumXY) / denom;
    const beta  = (n * sumXY - sumX * sumY)  / denom;
    if (alpha <= 0 || beta <= 0) return null;
    return Math.sqrt(beta / alpha);
  }

  // AFM-like (peak at R or X): fit ±WIN points around peak in k-space.
  const WIN = 4;
  const lo = Math.max(0, peakIdx - WIN);
  const hi = Math.min(nPts - 1, peakIdx + WIN);
  const k0 = pathDef[peakIdx];
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0, n = 0;
  for (let i = lo; i <= hi; i++) {
    const s = skSum[i] / count;
    if (!(s > 0)) continue;
    const p = pathDef[i];
    const dk2 = kFactor * ((p.nx - k0.nx) ** 2 + (p.ny - k0.ny) ** 2 + (p.nz - k0.nz) ** 2);
    const y = 1 / s;
    sumX += dk2; sumY += y; sumXX += dk2 * dk2; sumXY += dk2 * y; n++;
  }
  if (n < 2) return null;
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-30) return null;
  const alpha = (sumY * sumXX - sumX * sumXY) / denom;
  const beta  = (n * sumXY - sumX * sumY)  / denom;
  if (alpha <= 0 || beta <= 0) return null;
  return Math.sqrt(beta / alpha);
}

// High-symmetry path Γ→X→M→R→Γ on the simple-cubic Brillouin zone.
// Coordinates are in units of (2π/N), so (N/2) corresponds to k=π.
export function buildSkPath(N: number): { nx: number; ny: number; nz: number }[] {
  const H = Math.floor(N / 2);
  const steps = Math.max(4, Math.floor(H / 2)); // ~4–8 points per segment
  const path: { nx: number; ny: number; nz: number }[] = [];
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const seg = (
    [ax, ay, az]: number[],
    [bx, by, bz]: number[],
    skip0 = false,
  ) => {
    for (let i = skip0 ? 1 : 0; i <= steps; i++) {
      const t = i / steps;
      path.push({ nx: lerp(ax, bx, t), ny: lerp(ay, by, t), nz: lerp(az, bz, t) });
    }
  };
  seg([0, 0, 0], [H, 0, 0]);          // Γ → X
  seg([H, 0, 0], [H, H, 0], true);    // X → M
  seg([H, H, 0], [H, H, H], true);    // M → R
  seg([H, H, H], [0, 0, 0], true);    // R → Γ
  return path;
}

// Segment boundary indices within the path array.
export function skPathSegments(N: number): { label: string; idx: number }[] {
  const steps = Math.max(4, Math.floor(Math.floor(N / 2) / 2));
  return [
    { label: "Γ", idx: 0 },
    { label: "X", idx: steps },
    { label: "M", idx: steps * 2 },
    { label: "R", idx: steps * 3 },
    { label: "Γ", idx: steps * 4 },
  ];
}

export type SimStats = {
  magnetization: number;
  energyPerSite: number; // E / (N|J₁|)
  sweeps: number;
  neelOrderParam: number;   // (1/N³) Σ sᵢ(−1)^(x+y+z)
  stripeOrderParam: number; // max_α sqrt(S(k_α)/N³) — detects layered phase
  /** S(k)/N³ along Γ→X→M→R→Γ; null until first measurement */
  skPath: Float32Array | null;
  /** energy/site samples; null until ≥20 */
  energySamples: Float32Array | null;
  /** magnetization samples; null until ≥20 */
  magnetizationSamples: Float32Array | null;
  histSamplesFilled: number;
  /** sample std dev of energy/site; null until ≥20 samples */
  energyStdDev: number | null;
  /** sample std dev of magnetization; null until ≥20 samples */
  magnetizationStdDev: number | null;
  /** specific heat per site: N·σ_ε²/T*²; null until ≥20 samples */
  heatCapacity: number | null;
  /** magnetic susceptibility per site: N·σ_m²/T*; null until ≥20 samples */
  susceptibility: number | null;
  /** FM correlation length in lattice units from OZ fit near Γ; null until ≥10 S(k) measurements */
  correlationLength: number | null;
  /** C(r)/C(0) for r=0..N/2 along x-axis (1D DFT of Γ→X S(k)); null until ≥10 measurements */
  correlationData: Float32Array | null;
};

export function useSimulation({
  canvasRef,
  initialSpins,
  betaJ,
  betaJ2,
  betaH,
  tStar,
  sliceAxis,
  sliceIndex,
  running,
  onStats,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  initialSpins: Uint8Array;
  betaJ: number;
  betaJ2: number;
  betaH: number;
  tStar: number;
  sliceAxis: SliceAxis;
  sliceIndex: number;
  running: boolean;
  onStats: (stats: SimStats) => void;
}) {
  const latticeRef = useRef<SpinLattice>(new SpinLattice(initialSpins));
  const wasmRef = useRef<WasmLattice | null>(null);
  const paramsRef = useRef({ betaJ, betaJ2, betaH, tStar, sliceAxis, sliceIndex });
  const runningRef = useRef(running);
  const onStatsRef = useRef(onStats);
  const sweepsRef = useRef(0);
  const frameRef = useRef(0);
  const skPathRef = useRef<Float32Array | null>(null);
  const skPathDefRef = useRef<{ nx: number; ny: number; nz: number }[]>([]);
  const skLastComputedSweepRef = useRef(-1);
  const stripeRef = useRef<number>(0);
  const energyBufRef = useRef(new Float32Array(ENERGY_BUFFER_SIZE));
  const magnetizationBufRef = useRef(new Float32Array(ENERGY_BUFFER_SIZE));
  const histSampleCountRef = useRef(0);
  const lastParamsForHistRef = useRef<{ betaJ: number; betaJ2: number; betaH: number } | null>(null);
  const skSumBufRef = useRef<Float32Array | null>(null);
  const skSumCountRef = useRef(0);

  paramsRef.current = { betaJ, betaJ2, betaH, tStar, sliceAxis, sliceIndex };
  runningRef.current = running;
  onStatsRef.current = onStats;

  useEffect(() => {
    const newLat = new SpinLattice(initialSpins);
    latticeRef.current = newLat;
    sweepsRef.current = 0;
    skPathRef.current = null;
    skLastComputedSweepRef.current = -1;
    stripeRef.current = 0;
    const newPathDef = buildSkPath(newLat.latticeSize);
    skPathDefRef.current = newPathDef;
    skSumBufRef.current = new Float32Array(newPathDef.length);
    skSumCountRef.current = 0;
    histSampleCountRef.current = 0;
    lastParamsForHistRef.current = null;

    // (Re-)initialize WASM lattice from the new JS bytes.
    // loadWasm() is cached after the first call.
    loadWasm().then(({ SpinLattice: W }) => {
      const bytes = new Uint8Array(newLat);
      const seed = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      wasmRef.current?.free();
      wasmRef.current = W.from_bytes(bytes, newLat.latticeSize, seed);
    });
  }, [initialSpins]);

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  useEffect(() => {
    let animId: number;

    const tick = () => {
      const { betaJ, betaJ2, betaH, tStar, sliceAxis, sliceIndex } = paramsRef.current;
      const wl = wasmRef.current;

      frameRef.current++;
      let didSweep = false;
      if (runningRef.current && frameRef.current % FRAMES_PER_SWEEP === 0) {
        const isInfTemp = !isFinite(tStar); // T*=∞ → K₁=K₂=h̃=0 → every Δ=0 → all flip → 2-cycle
        if (wl) {
          try {
            if (isInfTemp) {
              wl.randomize();
            } else {
              wl.sublattice_sweep(betaJ, betaJ2, betaH);
            }
            latticeRef.current.set(wl.data());
          } catch (e) {
            console.error("[wasm] sweep error:", e);
          }
        } else {
          // fallback to JS until WASM is loaded
          if (isInfTemp) {
            latticeRef.current.randomize();
          } else {
            latticeRef.current = simulateMetropoliseSweepLattice(
              latticeRef.current, betaJ, betaJ2, betaH
            );
          }
        }
        sweepsRef.current++;
        didSweep = true;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const wl = wasmRef.current;
          const N = latticeRef.current.latticeSize;
          const pixelsPerSpin = Math.max(1, Math.ceil(Math.max(canvas.width, canvas.height) / N));
          const tileSize = pixelsPerSpin * N;
          const axisCode = sliceAxis === "x" ? 0 : sliceAxis === "y" ? 1 : 2;
          const imageData = wl
            ? (() => {
                const rgba = wl.render_slice(axisCode, sliceIndex);
                return new ImageData(new Uint8ClampedArray(rgba.buffer), N, N);
              })()
            : renderSliceToImageData(latticeRef.current, sliceAxis, sliceIndex);
          drawTiledOnCanvas(ctx, imageData, tileSize);
        }
      }

      // Recompute S(k) every SF_SWEEP_INTERVAL new sweeps (once per qualifying sweep count)
      const sw = sweepsRef.current;
      if (
        sw !== skLastComputedSweepRef.current &&
        sw % SF_SWEEP_INTERVAL === 0 &&
        skPathDefRef.current.length > 0
      ) {
        skLastComputedSweepRef.current = sw;
        if (wl) {
          const path = skPathDefRef.current;
          const nxArr = new Int32Array(path.map(p => p.nx));
          const nyArr = new Int32Array(path.map(p => p.ny));
          const nzArr = new Int32Array(path.map(p => p.nz));
          const raw = wl.structure_factor_path(nxArr, nyArr, nzArr);
          skPathRef.current = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
          // WASM returns sqrt(max_sf/N³) = |Σ|/N^(3/2); divide by sqrt(N³) to get |Σ|/N³.
          stripeRef.current = wl.stripe_order_param() / Math.sqrt(latticeRef.current.spinCount);
        } else {
          const path = skPathDefRef.current;
          const arr = new Float32Array(path.length);
          const lat = latticeRef.current;
          const N3 = lat.spinCount;
          for (let i = 0; i < path.length; i++) {
            const { nx, ny, nz } = path[i];
            arr[i] = lat.structureFactorAt(nx, ny, nz) / N3;
          }
          skPathRef.current = arr;
          stripeRef.current = lat.stripeOrderParam();
        }
        // Accumulate S(k) running sum for OZ correlation length
        if (skPathRef.current && skSumBufRef.current) {
          const path = skPathRef.current;
          const sum = skSumBufRef.current;
          for (let i = 0; i < path.length; i++) sum[i] += path[i];
          skSumCountRef.current++;
        }
      }

      const energyPerSite = isFinite(tStar)
        ? wl
          ? (wl.beta_energy(betaJ, betaJ2, betaH) / latticeRef.current.spinCount) * tStar
          : (latticeRef.current.betaEnergy(betaJ, betaJ2, betaH) / latticeRef.current.spinCount) * tStar
        : 0;

      if (didSweep && isFinite(tStar)) {
        const last = lastParamsForHistRef.current;
        if (!last || last.betaJ !== betaJ || last.betaJ2 !== betaJ2 || last.betaH !== betaH) {
          histSampleCountRef.current = 0;
          sweepsRef.current = 0;
          lastParamsForHistRef.current = { betaJ, betaJ2, betaH };
          if (skSumBufRef.current) skSumBufRef.current.fill(0);
          skSumCountRef.current = 0;
        }
        const pos = histSampleCountRef.current % ENERGY_BUFFER_SIZE;
        energyBufRef.current[pos] = energyPerSite;
        magnetizationBufRef.current[pos] = wl
          ? wl.magnetization()
          : latticeRef.current.magnetization();
        histSampleCountRef.current++;
      }

      const filled = Math.min(histSampleCountRef.current, ENERGY_BUFFER_SIZE);
      const energyStdDev = filled >= 20 ? sampleStdDev(energyBufRef.current, filled) : null;
      const magnetizationStdDev = filled >= 20 ? sampleStdDev(magnetizationBufRef.current, filled) : null;
      const spinCount = latticeRef.current.spinCount;
      const heatCapacity = (isFinite(tStar) && tStar > 0 && energyStdDev !== null)
        ? spinCount * energyStdDev ** 2 / tStar ** 2
        : null;
      const susceptibility = (isFinite(tStar) && tStar > 0 && magnetizationStdDev !== null)
        ? spinCount * magnetizationStdDev ** 2 / tStar
        : null;
      const skReady = (
        isFinite(tStar) &&
        skSumCountRef.current >= 10 &&
        skSumBufRef.current !== null &&
        skPathDefRef.current.length > 0
      );
      const correlationLength = skReady ? fitCorrelationLength(
        skSumBufRef.current!,
        skSumCountRef.current,
        skPathDefRef.current,
        latticeRef.current.latticeSize
      ) : null;
      const correlationData = skReady ? computeCorrelationData(
        skSumBufRef.current!,
        skSumCountRef.current,
        skPathDefRef.current,
        latticeRef.current.latticeSize
      ) : null;

      onStatsRef.current({
        magnetization: wl ? wl.magnetization() : latticeRef.current.magnetization(),
        energyPerSite,
        sweeps: sweepsRef.current,
        neelOrderParam: wl ? wl.neel_order_param() : latticeRef.current.neelOrderParam(),
        stripeOrderParam: stripeRef.current,
        skPath: skPathRef.current,
        energySamples: filled >= 20 ? energyBufRef.current.slice(0, filled) : null,
        magnetizationSamples: filled >= 20 ? magnetizationBufRef.current.slice(0, filled) : null,
        histSamplesFilled: filled,
        energyStdDev,
        magnetizationStdDev,
        heatCapacity,
        susceptibility,
        correlationLength,
        correlationData,
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []); // intentionally empty — all mutable state accessed via refs
}
