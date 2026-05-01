import { describe, it, expect, test } from "vitest";
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

  it("NNN energy: all-up lattice with betaJ2 = 1", () => {
    // 12 NNN bonds per site, each = +1; N³ × 12/2 bonds total; E = -betaJ2 × bonds
    const N = 2;
    const lat = uniform(N, 1);
    expect(lat.betaEnergy(0, 1, 0)).toBeCloseTo(-(N ** 3) * 6);
  });
});

// -------------------------------------------------------------------------

describe("SpinLattice – bitIndex layout", () => {
  test.each([2, 4, 8])("N=%i: all N³ coords map to distinct indices in [0, N³)", (N) => {
    const lat = new SpinLattice(N);
    const seen = new Set<number>();
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const idx = lat.bitIndex({ x, y, z });
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(N ** 3);
          expect(seen.has(idx)).toBe(false);
          seen.add(idx);
        }
    expect(seen.size).toBe(N ** 3);
  });

  it("periodic wrapping resolves to the same index as the canonical coord", () => {
    const lat = new SpinLattice(4);
    expect(lat.bitIndex({ x: 4, y: 0, z: 0 })).toBe(lat.bitIndex({ x: 0, y: 0, z: 0 }));
    expect(lat.bitIndex({ x: -1, y: 0, z: 0 })).toBe(lat.bitIndex({ x: 3, y: 0, z: 0 }));
    expect(lat.bitIndex({ x: 0, y: 5, z: -2 })).toBe(lat.bitIndex({ x: 0, y: 1, z: 2 }));
  });
});

// -------------------------------------------------------------------------

describe("SpinLattice – order parameters", () => {
  it("neelOrderParam: perfect Néel state returns +1 or −1", () => {
    const lat = SpinLattice.createNeel(4);
    expect(Math.abs(lat.neelOrderParam())).toBeCloseTo(1);
  });

  it("neelOrderParam: ferromagnetic state returns 0", () => {
    expect(SpinLattice.createFerro(4).neelOrderParam()).toBeCloseTo(0);
  });

  it("stripeOrderParam: perfect layered state (along x) returns 1", () => {
    expect(SpinLattice.createLayered(4).stripeOrderParam()).toBeCloseTo(1);
  });

  it("stripeOrderParam: diagonal-layered state returns 1", () => {
    expect(SpinLattice.createDiagonalLayered(4).stripeOrderParam()).toBeCloseTo(1);
  });

  it("stripeOrderParam: ferromagnetic state returns 0", () => {
    expect(SpinLattice.createFerro(4).stripeOrderParam()).toBeCloseTo(0);
  });
});

// -------------------------------------------------------------------------

describe("SpinLattice – structureFactorAt", () => {
  it("S(0,0,0) for all-up ferro equals N³ (ferromagnetic peak at Γ)", () => {
    const N = 4;
    const lat = SpinLattice.createFerro(N);
    // re = Σ spin × cos(0) = N³, im = Σ spin × sin(0) = 0 → S = N³²/N³ = N³
    expect(lat.structureFactorAt(0, 0, 0)).toBeCloseTo(N ** 3);
  });

  it("S(H,H,H) for perfect Néel state equals N³ (AFM peak at R-point)", () => {
    const N = 4;
    const H = N / 2; // π/a wavevector index
    const lat = SpinLattice.createNeel(N);
    // Phase cos(π(x+y+z)) = (-1)^(x+y+z) = spin at each site → all terms = +1
    expect(lat.structureFactorAt(H, H, H)).toBeCloseTo(N ** 3);
  });

  it("S(H,0,0) for perfect layered state equals N³ (stripe peak at X-point)", () => {
    const N = 4;
    const H = N / 2;
    const lat = SpinLattice.createLayered(N);
    // Layered s = (-1)^x, phase cos(πx) = (-1)^x → all terms = +1
    expect(lat.structureFactorAt(H, 0, 0)).toBeCloseTo(N ** 3);
  });

  it("S(0,0,0) for all-up ferro with N=2 equals 8", () => {
    const lat = SpinLattice.createFerro(2);
    expect(lat.structureFactorAt(0, 0, 0)).toBeCloseTo(8);
  });
});

// -------------------------------------------------------------------------

describe("SpinLattice – energyAt", () => {
  it("all-up lattice: flipping any site raises energy by 12 betaJ (6 NN each contributing 2)", () => {
    const N = 4;
    const betaJ = 1;
    const lat = uniform(N, 1);
    const coord = { x: 2, y: 2, z: 2 };
    const eBefore = lat.energyAt(coord, betaJ, 0, 0);
    lat.flipSpin(coord);
    const eAfter = lat.energyAt(coord, betaJ, 0, 0);
    // flipped site is -1 surrounded by 6 +1 neighbours → local E goes from -6 to +6
    expect(eAfter - eBefore).toBeCloseTo(12);
  });

  it("all-up with NNN: flipping raises energy by 12·betaJ + 24·betaJ2", () => {
    const N = 4;
    const betaJ = 1;
    const betaJ2 = 1;
    const lat = uniform(N, 1);
    const coord = { x: 2, y: 2, z: 2 };
    const eBefore = lat.energyAt(coord, betaJ, betaJ2, 0);
    lat.flipSpin(coord);
    const eAfter = lat.energyAt(coord, betaJ, betaJ2, 0);
    // s flips +1→-1; ΔE = 2·betaJ·nnSum + 2·betaJ2·nnnSum = 2·1·6 + 2·1·12 = 36
    expect(eAfter - eBefore).toBeCloseTo(12 * betaJ + 24 * betaJ2);
  });
});
