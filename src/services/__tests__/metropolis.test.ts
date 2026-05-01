import { describe, it, expect } from "vitest";
import { SpinLattice } from "../spin-lattice";
import {
  simulateMetropoliseSweepLattice,
  simulateMetropolis,
  sublatticeSweepLattice,
} from "../metropolis";

function xorshift(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 2 ** 32;
  };
}

describe("simulateMetropoliseSweepLattice", () => {
  it("returns a new SpinLattice, not the same object", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropoliseSweepLattice(lat, 1, 0, 0, xorshift(1));
    expect(result).not.toBe(lat);
  });

  it("does not mutate the input lattice", () => {
    const lat = SpinLattice.createFerro(4);
    simulateMetropoliseSweepLattice(lat, 1, 0, 0, xorshift(2));
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 (large betaJ): magnetization stays 1", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropoliseSweepLattice(lat, 100, 0, 0, xorshift(3));
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves AFM Néel order at T→0 with betaJ2 coupling", () => {
    const lat = SpinLattice.createNeel(4);
    const result = simulateMetropoliseSweepLattice(lat, 0, 100, 0, xorshift(4));
    expect(Math.abs(result.neelOrderParam())).toBeCloseTo(1);
  });
});

describe("simulateMetropolis", () => {
  it("sweeps=0 returns a copy with identical spin configuration", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropolis(lat, 1, 0, 0, 0, xorshift(5));
    expect(result).not.toBe(lat);
    for (let z = 0; z < 4; z++)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          expect(result.getSpin({ x, y, z })).toBe(lat.getSpin({ x, y, z }));
  });

  it("does not mutate the input across multiple sweeps", () => {
    const lat = SpinLattice.createFerro(4);
    simulateMetropolis(lat, 1, 0, 0, 3, xorshift(6));
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 across multiple sweeps", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropolis(lat, 100, 0, 0, 5, xorshift(7));
    expect(result.magnetization()).toBeCloseTo(1);
  });
});

describe("sublatticeSweepLattice", () => {
  it("returns a new SpinLattice, not the same object", () => {
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 1, 0, 0, xorshift(8));
    expect(result).not.toBe(lat);
  });

  it("does not mutate the input lattice", () => {
    const lat = SpinLattice.createFerro(4);
    sublatticeSweepLattice(lat, 0, 0, 0);
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("T→∞ (betaJ=betaJ2=betaH=0): all-up flips to all-down (ΔE=0 so every site is accepted)", () => {
    // At infinite temperature K₁=K₂=h̃=0, so energyAt=0 for every site,
    // ΔE=−2×0=0≤0 — every spin is marked for flipping deterministically.
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 0, 0, 0);
    expect(result.magnetization()).toBeCloseTo(-1);
  });

  it("T→∞: all-down flips to all-up", () => {
    const lat = SpinLattice.createFerro(4);
    for (let z = 0; z < 4; z++)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          lat.setSpin({ x, y, z }, -1);
    const result = sublatticeSweepLattice(lat, 0, 0, 0);
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 (large betaJ)", () => {
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 100, 0, 0, xorshift(9));
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves Néel order at T→0 (large |betaJ2|, AFM NNN)", () => {
    const lat = SpinLattice.createNeel(4);
    const result = sublatticeSweepLattice(lat, 0, 100, 0, xorshift(10));
    expect(Math.abs(result.neelOrderParam())).toBeCloseTo(1);
  });
});
