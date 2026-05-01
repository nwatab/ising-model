// Pure statistical and Brillouin-zone-path functions, extracted from useSimulation
// for testability. No React imports; no side effects.

export function sampleStdDev(arr: Float32Array, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += arr[i];
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) sq += (arr[i] - mean) ** 2;
  return Math.sqrt(sq / (n - 1));
}

// C(r) ≈ f(r)/f(0), f(r) = Σ_{j=0}^{steps} ⟨S(k_j)/N³⟩·cos(2π·nx_j·r/N)
// Uses Γ→X segment only; cost O(steps·rMax) per call (~2k ops for N=128).
export function computeCorrelationData(
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
export function fitCorrelationLength(
  skSum: Float32Array,
  count: number,
  pathDef: { nx: number; ny: number; nz: number }[],
  N: number
): number | null {
  const nPts = pathDef.length;
  const steps = Math.max(4, Math.floor(Math.floor(N / 2) / 2));
  const kFactor = (2 * Math.PI / N) ** 2;

  // Find peak, excluding both Γ endpoints (index 0 and nPts-1 are the same k-point).
  let peakIdx = 1;
  let peakVal = skSum[1] / count;
  for (let i = 2; i < nPts - 1; i++) {
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
  // The peak point itself (dk²=0) is EXCLUDED: in the ordered phase it carries
  // a Bragg spike (S ∝ N³M²) that dwarfs the fluctuation background, making
  // 1/S(peak) ≈ 0 and pulling the OZ intercept α below zero. Excluding it
  // leaves only the fluctuation spectrum, which is what ξ measures.
  const WIN = 4;
  const lo = Math.max(1, peakIdx - WIN);
  const hi = Math.min(nPts - 2, peakIdx + WIN);
  const k0 = pathDef[peakIdx];
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0, n = 0;
  for (let i = lo; i <= hi; i++) {
    if (i === peakIdx) continue;
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
  const steps = Math.max(4, Math.floor(H / 2));
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
