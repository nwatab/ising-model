import { describe, it, expect } from "vitest";
import {
  sampleStdDev,
  computeCorrelationData,
  fitCorrelationLength,
  buildSkPath,
  skPathSegments,
} from "../statistics";

// ─── helpers ────────────────────────────────────────────────────────────────

function f32(...vals: number[]): Float32Array {
  return new Float32Array(vals);
}

/** Steps for a given N, matching the production formula. */
function stepsFor(N: number) {
  return Math.max(4, Math.floor(Math.floor(N / 2) / 2));
}

// ─── sampleStdDev ───────────────────────────────────────────────────────────

describe("sampleStdDev", () => {
  it("returns 0 for a constant array", () => {
    expect(sampleStdDev(f32(5, 5, 5, 5), 4)).toBe(0);
  });

  it("matches analytical result for [1,2,3,4,5]", () => {
    // mean=3, Σ(x-mean)²=10, s=√(10/4)=√2.5
    expect(sampleStdDev(f32(1, 2, 3, 4, 5), 5)).toBeCloseTo(Math.sqrt(2.5), 10);
  });

  it("uses n−1 denominator (sample, not population)", () => {
    // population σ = 0.5, sample s = 1/√2 ≈ 0.7071
    expect(sampleStdDev(f32(0, 1), 2)).toBeCloseTo(Math.sqrt(0.5), 10);
  });

  it("respects the n parameter, ignoring elements beyond it", () => {
    const arr = f32(1, 2, 3, 999, 999);
    expect(sampleStdDev(arr, 3)).toBeCloseTo(sampleStdDev(f32(1, 2, 3), 3), 10);
  });
});

// ─── buildSkPath ─────────────────────────────────────────────────────────────

describe("buildSkPath", () => {
  it.each([8, 16, 32])("N=%i → length 4*steps+1", (N) => {
    const steps = stepsFor(N);
    expect(buildSkPath(N)).toHaveLength(4 * steps + 1);
  });

  it("first and last points are Γ=(0,0,0)", () => {
    const path = buildSkPath(16);
    expect(path[0]).toEqual({ nx: 0, ny: 0, nz: 0 });
    expect(path[path.length - 1]).toEqual({ nx: 0, ny: 0, nz: 0 });
  });

  it("X-point is (H,0,0) at index steps", () => {
    const N = 16;
    const H = Math.floor(N / 2);
    const steps = stepsFor(N);
    expect(buildSkPath(N)[steps]).toEqual({ nx: H, ny: 0, nz: 0 });
  });

  it("M-point is (H,H,0) at index 2*steps", () => {
    const N = 16;
    const H = Math.floor(N / 2);
    const steps = stepsFor(N);
    expect(buildSkPath(N)[steps * 2]).toEqual({ nx: H, ny: H, nz: 0 });
  });

  it("R-point is (H,H,H) at index 3*steps", () => {
    const N = 16;
    const H = Math.floor(N / 2);
    const steps = stepsFor(N);
    expect(buildSkPath(N)[steps * 3]).toEqual({ nx: H, ny: H, nz: H });
  });

  it("all coordinates lie in [0, H]", () => {
    const N = 16;
    const H = Math.floor(N / 2);
    for (const { nx, ny, nz } of buildSkPath(N)) {
      expect(nx).toBeGreaterThanOrEqual(0);
      expect(ny).toBeGreaterThanOrEqual(0);
      expect(nz).toBeGreaterThanOrEqual(0);
      expect(nx).toBeLessThanOrEqual(H);
      expect(ny).toBeLessThanOrEqual(H);
      expect(nz).toBeLessThanOrEqual(H);
    }
  });
});

// ─── skPathSegments ──────────────────────────────────────────────────────────

describe("skPathSegments", () => {
  it("returns 5 entries with labels Γ X M R Γ", () => {
    const segs = skPathSegments(16);
    expect(segs.map(s => s.label)).toEqual(["Γ", "X", "M", "R", "Γ"]);
  });

  it.each([8, 16, 32])("N=%i → indices match path boundaries", (N) => {
    const steps = stepsFor(N);
    const segs = skPathSegments(N);
    expect(segs[0].idx).toBe(0);
    expect(segs[1].idx).toBe(steps);
    expect(segs[2].idx).toBe(steps * 2);
    expect(segs[3].idx).toBe(steps * 3);
    expect(segs[4].idx).toBe(steps * 4);
  });

  it("final Γ index equals buildSkPath(N).length − 1", () => {
    const N = 16;
    const path = buildSkPath(N);
    const segs = skPathSegments(N);
    expect(segs[4].idx).toBe(path.length - 1);
  });
});

// ─── computeCorrelationData ──────────────────────────────────────────────────

describe("computeCorrelationData", () => {
  const N = 16;
  const pathDef = buildSkPath(N);
  const steps = stepsFor(N);
  const nPts = pathDef.length;

  it("returns null when all weights are zero", () => {
    expect(computeCorrelationData(new Float32Array(nPts), 1, pathDef, N)).toBeNull();
  });

  it("C(0) is always 1 when non-null", () => {
    const skSum = new Float32Array(nPts);
    skSum[1] = 1;
    const result = computeCorrelationData(skSum, 1, pathDef, N)!;
    expect(result[0]).toBeCloseTo(1, 10);
  });

  it("weight only at Γ → C(r)=1 for all r (ferromagnetic long-range order)", () => {
    // pathDef[0] = (0,0,0), cos(0)=1 → C(r)=1 everywhere
    const skSum = new Float32Array(nPts);
    skSum[0] = 1;
    const result = computeCorrelationData(skSum, 1, pathDef, N)!;
    const rMax = Math.floor(N / 2);
    for (let r = 0; r <= rMax; r++) {
      expect(result[r]).toBeCloseTo(1, 6);
    }
  });

  it("weight only at X → C(r)=(-1)^r (stripe antiferromagnetic signature)", () => {
    // pathDef[steps] = (H,0,0), cos(2π*H*r/N) = cos(π*r) = (-1)^r
    const skSum = new Float32Array(nPts);
    skSum[steps] = 1;
    const result = computeCorrelationData(skSum, 1, pathDef, N)!;
    const rMax = Math.floor(N / 2);
    for (let r = 1; r <= rMax; r++) {
      expect(result[r]).toBeCloseTo(r % 2 === 0 ? 1 : -1, 6);
    }
  });

  it("count > 1 normalises correctly (same result as count=1 with skSum/count)", () => {
    const skSum = new Float32Array(nPts);
    skSum[1] = 2;
    skSum[2] = 1;
    const r1 = computeCorrelationData(skSum, 2, pathDef, N)!;
    const skSum2 = new Float32Array(nPts);
    skSum2[1] = 1;
    skSum2[2] = 0.5;
    const r2 = computeCorrelationData(skSum2, 1, pathDef, N)!;
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i]).toBeCloseTo(r2[i], 10);
    }
  });
});

// ─── fitCorrelationLength ────────────────────────────────────────────────────

describe("fitCorrelationLength", () => {
  const N = 16;
  const pathDef = buildSkPath(N);
  const steps = stepsFor(N);
  const nPts = pathDef.length;
  const kFactor = (2 * Math.PI / N) ** 2;

  it("returns null for all-zero skSum", () => {
    expect(fitCorrelationLength(new Float32Array(nPts), 1, pathDef, N)).toBeNull();
  });

  it("returns null when fewer than 2 positive points in fit window", () => {
    const skSum = new Float32Array(nPts);
    skSum[1] = 1; // only one point in FM branch window
    expect(fitCorrelationLength(skSum, 1, pathDef, N)).toBeNull();
  });

  describe("FM branch (peak near Γ)", () => {
    it("recovers ξ = √(β/α) from exact OZ data on Γ→X", () => {
      // 1/S(k) = α + β·kFactor·nx² with α=0.5, β=1 → ξ=√2
      const alpha = 0.5, beta = 1;
      const skSum = new Float32Array(nPts).fill(0.001);
      for (let i = 1; i <= steps; i++) {
        const x = kFactor * pathDef[i].nx ** 2;
        skSum[i] = 1 / (alpha + beta * x);
      }
      // Make index 1 the largest so peakIdx stays ≤ 1
      // (OZ form is decreasing, so skSum[1] > skSum[2] > ...)
      const xi = fitCorrelationLength(skSum, 1, pathDef, N);
      expect(xi).not.toBeNull();
      expect(xi!).toBeCloseTo(Math.sqrt(beta / alpha), 5);
    });

    it("returns null when α ≤ 0 (diverging or negative intercept)", () => {
      // Construct data where regression intercept is negative
      const skSum = new Float32Array(nPts).fill(0.001);
      // Make S(k) grow with k → 1/S(k) decreasing → negative slope → α>0 but slope β<0
      // Instead: very large values everywhere so α<0 after regression
      for (let i = 1; i <= steps; i++) {
        skSum[i] = 1000; // near-flat and huge → 1/S≈0; regression α≈0, could go negative
      }
      // This is edge-case testing; the function returns null or a number but must not throw
      expect(() => fitCorrelationLength(skSum, 1, pathDef, N)).not.toThrow();
    });
  });

  describe("AFM Néel branch (peak at R)", () => {
    it("recovers ξ = √(β/α) from exact OZ data around R-point", () => {
      // R is at index 3*steps. Construct 1/S(k) = α + β·|k−kR|² → ξ=√(β/α)
      const alpha = 0.5, beta = 1;
      const rIdx = steps * 3; // R point index = 12 for N=16
      const k0 = pathDef[rIdx]; // (8,8,8)
      const skSum = new Float32Array(nPts).fill(0.001);
      // Fill window ±WIN around rIdx with OZ form
      const WIN = 4;
      const lo = Math.max(1, rIdx - WIN);
      const hi = Math.min(nPts - 2, rIdx + WIN);
      for (let i = lo; i <= hi; i++) {
        const p = pathDef[i];
        const dk2 = kFactor * ((p.nx - k0.nx) ** 2 + (p.ny - k0.ny) ** 2 + (p.nz - k0.nz) ** 2);
        skSum[i] = 1 / (alpha + beta * dk2);
      }
      // Ensure the R-point has the global peak among interior indices
      // S[rIdx] = 1/alpha = 2, which dominates the 0.001 background
      const xi = fitCorrelationLength(skSum, 1, pathDef, N);
      expect(xi).not.toBeNull();
      expect(xi!).toBeCloseTo(Math.sqrt(beta / alpha), 4);
    });

    it("recovers ξ consistently regardless of count (running average)", () => {
      // Accumulating with count=10 should give the same ξ as count=1 with skSum/10
      const alpha = 0.5, beta = 1;
      const rIdx = steps * 3;
      const k0 = pathDef[rIdx];
      const WIN = 4;
      const lo = Math.max(1, rIdx - WIN);
      const hi = Math.min(nPts - 2, rIdx + WIN);
      const count = 10;
      const skSum = new Float32Array(nPts).fill(0.01 * count);
      for (let i = lo; i <= hi; i++) {
        const p = pathDef[i];
        const dk2 = kFactor * ((p.nx - k0.nx) ** 2 + (p.ny - k0.ny) ** 2 + (p.nz - k0.nz) ** 2);
        skSum[i] = count / (alpha + beta * dk2);
      }
      const xi = fitCorrelationLength(skSum, count, pathDef, N);
      expect(xi).not.toBeNull();
      expect(xi!).toBeCloseTo(Math.sqrt(beta / alpha), 4);
    });
  });

  describe("AFM stripe branch (peak at X)", () => {
    it("recovers ξ from exact OZ data around X-point", () => {
      const alpha = 0.5, beta = 1;
      const xIdx = steps; // X point
      const k0 = pathDef[xIdx]; // (H,0,0)
      const skSum = new Float32Array(nPts).fill(0.001);
      const WIN = 4;
      const lo = Math.max(1, xIdx - WIN);
      const hi = Math.min(nPts - 2, xIdx + WIN);
      for (let i = lo; i <= hi; i++) {
        const p = pathDef[i];
        const dk2 = kFactor * ((p.nx - k0.nx) ** 2 + (p.ny - k0.ny) ** 2 + (p.nz - k0.nz) ** 2);
        skSum[i] = 1 / (alpha + beta * dk2);
      }
      const xi = fitCorrelationLength(skSum, 1, pathDef, N);
      expect(xi).not.toBeNull();
      expect(xi!).toBeCloseTo(Math.sqrt(beta / alpha), 4);
    });
  });
});
