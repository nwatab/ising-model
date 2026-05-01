import { SpinLattice } from "./spin-lattice";

export function simulateMetropoliseSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaJ2: number,
  betaH: number
) {
  const lat = new SpinLattice(lattice);
  const N = lattice.latticeSize;
  for (let _ = 0; _ < N ** 3; _++) {
    const x = Math.floor(Math.random() * N);
    const y = Math.floor(Math.random() * N);
    const z = Math.floor(Math.random() * N);
    const oldEnergy = lat.energyAt({ x, y, z }, betaJ, betaJ2, betaH);
    lat.flipSpin({ x, y, z });
    const newEnergy = lat.energyAt({ x, y, z }, betaJ, betaJ2, betaH);
    const deltaEnergy = newEnergy - oldEnergy;
    if (deltaEnergy > 0 && Math.random() > Math.exp(-deltaEnergy)) {
      lat.flipSpin({ x, y, z });
    }
  }
  return lat;
}

export function simulateMetropolis(
  lattice: SpinLattice,
  betaJ: number,
  betaJ2: number,
  betaH: number,
  sweeps: number
): SpinLattice {
  return Array.from({ length: sweeps }).reduce<SpinLattice>(
    (acc) => simulateMetropoliseSweepLattice(acc, betaJ, betaJ2, betaH),
    new SpinLattice(lattice)
  );
}

// 8-sublattice checkerboard sweep for 3D cubic with face-diagonal NNN.
//
// Coloring: (x%2, y%2, z%2) — 8 classes. Within each class, no two sites
// are NN (distance 1) or face-diagonal NNN (distance √2), so all sites in
// one pass are conditionally independent and can be flipped in parallel.
//
// Each of the 8 passes visits N³/8 sites; total work per sweep = N³ flips,
// same as the random sweep, but the inner loop is SIMD/thread-parallelisable.
export function sublatticeSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaJ2: number,
  betaH: number,
): SpinLattice {
  const lat = new SpinLattice(lattice);
  const N = lat.latticeSize;
  for (let parity = 0; parity < 8; parity++) {
    const sx = (parity >> 2) & 1;
    const sy = (parity >> 1) & 1;
    const sz =  parity       & 1;
    for (let z = sz; z < N; z += 2)
      for (let y = sy; y < N; y += 2)
        for (let x = sx; x < N; x += 2) {
          const old = lat.energyAt({ x, y, z }, betaJ, betaJ2, betaH);
          lat.flipSpin({ x, y, z });
          const nw  = lat.energyAt({ x, y, z }, betaJ, betaJ2, betaH);
          const dE  = nw - old;
          if (dE > 0 && Math.random() > Math.exp(-dE)) lat.flipSpin({ x, y, z });
        }
  }
  return lat;
}
