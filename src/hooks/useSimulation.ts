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
    skPathDefRef.current = buildSkPath(newLat.latticeSize);
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
          const pixelsPerSpin = Math.max(2, Math.floor(512 / N));
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
          stripeRef.current = wl.stripe_order_param();
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
          lastParamsForHistRef.current = { betaJ, betaJ2, betaH };
        }
        const pos = histSampleCountRef.current % ENERGY_BUFFER_SIZE;
        energyBufRef.current[pos] = energyPerSite;
        magnetizationBufRef.current[pos] = wl
          ? wl.magnetization()
          : latticeRef.current.magnetization();
        histSampleCountRef.current++;
      }

      const filled = Math.min(histSampleCountRef.current, ENERGY_BUFFER_SIZE);

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
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []); // intentionally empty — all mutable state accessed via refs
}
