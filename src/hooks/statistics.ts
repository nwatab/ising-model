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

// Correlation length from S(k) path — second-moment method throughout.
// ξ = √(S_conn(k*)/S(k*+δk) − 1) / |δk|
//
// FM/PM branch (no dominant non-Γ peak):
//   k* = Γ, S_conn(Γ) = N³·Var(M) passed as sConnGamma.
//   Handles flat S(k) (paramagnetic) and ξ → ∞ (deep ordered FM) correctly.
//
// AFM branch (S(k*) > 3·S(path[1])):
//   k* = detected peak (R for Néel, X for stripe).
//   S_conn(k*) = S(k*) − N³·M_op²; Bragg spike subtracted using instantaneous M_op.
//   If subtraction overshoots (numerical), falls back to S(k*) (still gives ξ ≫ L/2).
export function fitCorrelationLength(
  skSum: Float32Array,
  count: number,
  pathDef: { nx: number; ny: number; nz: number }[],
  N: number,
  sConnGamma: number | null = null,
  neelMag: number = 0,
  stripeMag: number = 0,
): number | null {
  const nPts = pathDef.length;
  const kFactor = (2 * Math.PI / N) ** 2;
  const steps = Math.max(4, Math.floor(Math.floor(N / 2) / 2));

  // Find peak, excluding both Γ endpoints (index 0 and nPts-1 are the same k-point).
  let peakIdx = 1;
  let peakVal = skSum[1] / count;
  for (let i = 2; i < nPts - 1; i++) {
    const v = skSum[i] / count;
    if (v > peakVal) { peakVal = v; peakIdx = i; }
  }

  // A true AFM peak has S(k*) >> S(path[1]) AND a real order parameter.
  // High-T noise can accidentally satisfy the S(k) ratio alone; requiring
  // |M_op| > 5% prevents mis-routing disordered states into the AFM branch.
  const sAtOne = skSum[1] / count;
  const hasAfmPeak = peakIdx > 1
    && skSum[peakIdx] / count > sAtOne * 3
    && (Math.abs(neelMag) > 0.05 || Math.abs(stripeMag) > 0.05);

  if (!hasAfmPeak) {
    // FM second-moment: ξ = √(S_conn(Γ)/S(δk) − 1) / |δk|
    if (!(sConnGamma! > 0)) return null;
    const sNext = sAtOne;
    if (!(sNext > 0)) return null;
    const ratio = sConnGamma! / sNext;
    if (ratio <= 1) return 0;
    const p0 = pathDef[0], p1 = pathDef[1];
    const dk2 = kFactor * ((p1.nx - p0.nx) ** 2 + (p1.ny - p0.ny) ** 2 + (p1.nz - p0.nz) ** 2);
    return dk2 > 0 ? Math.sqrt(ratio - 1) / Math.sqrt(dk2) : null;
  }

  // AFM second-moment: subtract Bragg spike at k* using instantaneous M_op.
  // If the subtraction overshoots (numerical; shouldn't happen in equilibrium),
  // fall back to the raw S(k*) — still large → ξ ≫ L/2 → "> L/2" display.
  if (peakIdx + 1 >= nPts - 1) return null; // avoid using the closing Γ endpoint
  const sPeak = skSum[peakIdx] / count;
  const N3 = N ** 3;
  const half = Math.max(2, Math.floor(steps / 4));
  let mOp = 0;
  if (Math.abs(peakIdx - steps * 3) <= half) mOp = Math.abs(neelMag);
  else if (Math.abs(peakIdx - steps) <= half) mOp = Math.abs(stripeMag);
  const rawConn = sPeak - N3 * mOp * mOp;
  const numerator = rawConn > 0 ? rawConn : sPeak;
  const sNext = skSum[peakIdx + 1] / count;
  // S(k*+δk) ≈ 0 in deep ordered phase (fluctuations vanish) → ξ ≫ L.
  if (!(sNext > 0)) return numerator > 0 ? Infinity : null;
  const ratio = numerator / sNext;
  if (ratio <= 1) return 0;
  const p0 = pathDef[peakIdx], p1 = pathDef[peakIdx + 1];
  const dk2 = kFactor * ((p1.nx - p0.nx) ** 2 + (p1.ny - p0.ny) ** 2 + (p1.nz - p0.nz) ** 2);
  return dk2 > 0 ? Math.sqrt(ratio - 1) / Math.sqrt(dk2) : null;
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
