import { describe, it, expect } from "vitest";
import { SpinLattice } from "../spin-lattice";
import {
  simulateMetropoliseSweepLattice,
  simulateMetropolis,
  sublatticeSweepLattice,
} from "../metropolis";

describe("simulateMetropoliseSweepLattice", () => {
  it("returns a new SpinLattice, not the same object", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropoliseSweepLattice(lat, 1, 0, 0);
    expect(result).not.toBe(lat);
  });

  it("does not mutate the input lattice", () => {
    const lat = SpinLattice.createFerro(4);
    simulateMetropoliseSweepLattice(lat, 1, 0, 0);
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 (large betaJ): magnetization stays 1", () => {
    // At betaJ=100, flip acceptance for aligned site ≈ exp(-1200) ≈ 0
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropoliseSweepLattice(lat, 100, 0, 0);
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves AFM Néel order at T→0 with betaJ2 coupling", () => {
    // Néel state is ground state for betaJ2 >> |betaJ|; large betaJ2 locks it in
    const lat = SpinLattice.createNeel(4);
    const result = simulateMetropoliseSweepLattice(lat, 0, 100, 0);
    expect(Math.abs(result.neelOrderParam())).toBeCloseTo(1);
  });
});

describe("simulateMetropolis", () => {
  it("sweeps=0 returns a copy with identical spin configuration", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropolis(lat, 1, 0, 0, 0);
    expect(result).not.toBe(lat);
    for (let z = 0; z < 4; z++)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          expect(result.getSpin({ x, y, z })).toBe(lat.getSpin({ x, y, z }));
  });

  it("does not mutate the input across multiple sweeps", () => {
    const lat = SpinLattice.createFerro(4);
    simulateMetropolis(lat, 1, 0, 0, 3);
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 across multiple sweeps", () => {
    const lat = SpinLattice.createFerro(4);
    const result = simulateMetropolis(lat, 100, 0, 0, 5);
    expect(result.magnetization()).toBeCloseTo(1);
  });
});

describe("sublatticeSweepLattice", () => {
  it("returns a new SpinLattice, not the same object", () => {
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 1, 0, 0);
    expect(result).not.toBe(lat);
  });

  it("does not mutate the input lattice", () => {
    const lat = SpinLattice.createFerro(4);
    sublatticeSweepLattice(lat, 0, 0, 0);
    expect(lat.magnetization()).toBeCloseTo(1);
  });

  it("with J=h=0: all-up flips to all-down (ΔE=0 so every site is accepted)", () => {
    // When all couplings are zero, energyAt=0 for every site, ΔE=−2×0=0≤0,
    // so every spin is marked for flipping — a deterministic full-lattice flip.
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 0, 0, 0);
    expect(result.magnetization()).toBeCloseTo(-1);
  });

  it("with J=h=0: all-down flips to all-up", () => {
    const lat = SpinLattice.createFerro(4);
    // manually set all-down via negating ferro
    for (let z = 0; z < 4; z++)
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          lat.setSpin({ x, y, z }, -1);
    const result = sublatticeSweepLattice(lat, 0, 0, 0);
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves FM order at T→0 (large betaJ)", () => {
    const lat = SpinLattice.createFerro(4);
    const result = sublatticeSweepLattice(lat, 100, 0, 0);
    expect(result.magnetization()).toBeCloseTo(1);
  });

  it("preserves Néel order at T→0 (large |betaJ2|, AFM NNN)", () => {
    const lat = SpinLattice.createNeel(4);
    const result = sublatticeSweepLattice(lat, 0, 100, 0);
    expect(Math.abs(result.neelOrderParam())).toBeCloseTo(1);
  });
});
