import { describe, it, expect } from "vitest";
import { SpinLattice } from "../spin-lattice";

// Helpers -----------------------------------------------------------------

/** Create an N³ lattice with every spin set to `spin`. */
function uniform(N: number, spin: 1 | -1): SpinLattice {
  const lat = new SpinLattice(N);
  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        lat.setSpin({ x, y, z }, spin);
  return lat;
}

// -------------------------------------------------------------------------

describe("SpinLattice – construction", () => {
  it("reports the correct lattice size", () => {
    const lat = new SpinLattice(4);
    expect(lat.latticeSize).toBe(4);
    expect(lat.spinCount).toBe(64);
  });

  it("copy-constructs from a Uint8Array and preserves all spins", () => {
    const original = uniform(2, 1); // all-up 2³ lattice
    const copy = new SpinLattice(original as Uint8Array);
    for (let z = 0; z < 2; z++)
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++)
          expect(copy.getSpin({ x, y, z })).toBe(1);
  });

  it("createRandom returns a lattice of the correct size", () => {
    const lat = SpinLattice.createRandom(4);
    expect(lat.latticeSize).toBe(4);
    expect(lat.spinCount).toBe(64);
  });
});

describe("SpinLattice – getSpin / setSpin / flipSpin", () => {
  it("setSpin and getSpin round-trip +1 and -1", () => {
    const lat = new SpinLattice(2);
    lat.setSpin({ x: 0, y: 0, z: 0 }, 1);
    lat.setSpin({ x: 1, y: 0, z: 0 }, -1);
    expect(lat.getSpin({ x: 0, y: 0, z: 0 })).toBe(1);
    expect(lat.getSpin({ x: 1, y: 0, z: 0 })).toBe(-1);
  });

  it("flipSpin returns the new spin value", () => {
    const lat = uniform(2, 1);
    const flipped = lat.flipSpin({ x: 0, y: 0, z: 0 });
    expect(flipped).toBe(-1);
    expect(lat.getSpin({ x: 0, y: 0, z: 0 })).toBe(-1);
  });

  it("two flips restore the original spin", () => {
    const lat = uniform(2, 1);
    lat.flipSpin({ x: 1, y: 1, z: 1 });
    lat.flipSpin({ x: 1, y: 1, z: 1 });
    expect(lat.getSpin({ x: 1, y: 1, z: 1 })).toBe(1);
  });

  it("setting one site does not affect its neighbours", () => {
    const lat = uniform(4, 1);
    lat.setSpin({ x: 2, y: 2, z: 2 }, -1);
    expect(lat.getSpin({ x: 1, y: 2, z: 2 })).toBe(1);
    expect(lat.getSpin({ x: 3, y: 2, z: 2 })).toBe(1);
    expect(lat.getSpin({ x: 2, y: 1, z: 2 })).toBe(1);
    expect(lat.getSpin({ x: 2, y: 3, z: 2 })).toBe(1);
  });
});

describe("SpinLattice – periodic boundary wrapping", () => {
  it("getSpin wraps negative coordinates", () => {
    const lat = uniform(4, 1);
    lat.setSpin({ x: 3, y: 0, z: 0 }, -1);
    expect(lat.getSpin({ x: -1, y: 0, z: 0 })).toBe(-1);
  });

  it("getSpin wraps coordinates >= N", () => {
    const lat = uniform(4, 1);
    lat.setSpin({ x: 0, y: 0, z: 0 }, -1);
    expect(lat.getSpin({ x: 4, y: 0, z: 0 })).toBe(-1);
    expect(lat.getSpin({ x: 8, y: 0, z: 0 })).toBe(-1);
  });

  it("all six periodic neighbours of a corner site are accessible", () => {
    const lat = uniform(2, -1);
    lat.setSpin({ x: 0, y: 0, z: 0 }, 1);
    // The six neighbours of (1,1,1) with N=2 are all (0,*,*) or similar via wrapping
    // and the corner site (0,0,0) should be reachable as each neighbour wraps to it
    expect(lat.getSpin({ x: 2, y: 0, z: 0 })).toBe(1); // x wrap → (0,0,0)
    expect(lat.getSpin({ x: 0, y: 2, z: 0 })).toBe(1); // y wrap → (0,0,0)
    expect(lat.getSpin({ x: 0, y: 0, z: 2 })).toBe(1); // z wrap → (0,0,0)
  });
});

describe("SpinLattice – magnetization", () => {
  it("all-up lattice has magnetization +1", () => {
    expect(uniform(4, 1).magnetization()).toBeCloseTo(1);
  });

  it("all-down lattice has magnetization -1", () => {
    expect(uniform(4, -1).magnetization()).toBeCloseTo(-1);
  });

  it("half-up half-down lattice has magnetization ≈ 0", () => {
    const N = 2; // 8 spins
    const lat = new SpinLattice(N);
    // set 4 up, 4 down
    lat.setSpin({ x: 0, y: 0, z: 0 }, 1);
    lat.setSpin({ x: 1, y: 0, z: 0 }, 1);
    lat.setSpin({ x: 0, y: 1, z: 0 }, 1);
    lat.setSpin({ x: 1, y: 1, z: 0 }, 1);
    lat.setSpin({ x: 0, y: 0, z: 1 }, -1);
    lat.setSpin({ x: 1, y: 0, z: 1 }, -1);
    lat.setSpin({ x: 0, y: 1, z: 1 }, -1);
    lat.setSpin({ x: 1, y: 1, z: 1 }, -1);
    expect(lat.magnetization()).toBeCloseTo(0);
  });
});

describe("SpinLattice – betaEnergy", () => {
  it("all-up lattice: interaction energy = -3 betaJ per site (6 neighbours, each bond counted once)", () => {
    // Each bond sᵢsⱼ = +1. Each site has 3 unique bonds (to +x, +y, +z neighbour).
    // betaEnergy = -betaJ * N³ * 3 for all-up.
    const N = 2;
    const lat = uniform(N, 1);
    const betaJ = 1.0;
    const expected = -betaJ * N ** 3 * 3;
    expect(lat.betaEnergy(betaJ, 0, 0)).toBeCloseTo(expected);
  });

  it("all-down lattice has the same energy as all-up (spin-flip symmetry at h=0)", () => {
    const N = 2;
    const betaJ = 0.5;
    expect(uniform(N, -1).betaEnergy(betaJ, 0, 0)).toBeCloseTo(
      uniform(N, 1).betaEnergy(betaJ, 0, 0)
    );
  });

  it("external field shifts energy proportionally to magnetisation", () => {
    const N = 2;
    // all-up: sumSpins = N³, so field term = -betaH * N³
    const lat = uniform(N, 1);
    const betaJ = 0.3;
    const betaH = 0.5;
    const eNoField = lat.betaEnergy(betaJ, 0, 0);
    const eWithField = lat.betaEnergy(betaJ, 0, betaH);
    expect(eWithField - eNoField).toBeCloseTo(-betaH * N ** 3);
  });

  it("single isolated spin in an N=2 all-up lattice: energyAt is consistent with betaEnergy change", () => {
    // Flip one spin and measure the delta via both methods.
    const N = 2;
    const betaJ = 0.4;
    const betaH = 0.2;
    const lat = uniform(N, 1);
    const coord = { x: 0, y: 0, z: 0 };

    const eBefore = lat.betaEnergy(betaJ, 0, betaH);
    const localBefore = lat.energyAt(coord, betaJ, 0, betaH);
    lat.flipSpin(coord);
    const localAfter = lat.energyAt(coord, betaJ, 0, betaH);
    const eAfter = lat.betaEnergy(betaJ, 0, betaH);

    // delta from energyAt should match delta from full betaEnergy
    expect(localAfter - localBefore).toBeCloseTo(eAfter - eBefore, 10);
  });

  it("betaJ = 0 and betaH = 0 gives zero energy regardless of spin config", () => {
    expect(uniform(4, 1).betaEnergy(0, 0, 0)).toBeCloseTo(0);
    expect(uniform(4, -1).betaEnergy(0, 0, 0)).toBeCloseTo(0);
  });
});
