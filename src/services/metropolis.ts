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

// Synchronous sweep: all 8 colour sublattices processed simultaneously.
// Phase 1 collects flip decisions using the pre-sweep state (ΔE = −2×energyAt);
// phase 2 applies them all at once, so no colour waits on another.
export function sublatticeSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaJ2: number,
  betaH: number,
): SpinLattice {
  const lat = new SpinLattice(lattice);
  const N = lat.latticeSize;
  const toFlip: { x: number; y: number; z: number }[] = [];

  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const delta = -2 * lat.energyAt({ x, y, z }, betaJ, betaJ2, betaH);
        if (delta <= 0 || Math.random() < Math.exp(-delta))
          toFlip.push({ x, y, z });
      }

  toFlip.forEach(coord => lat.flipSpin(coord));
  return lat;
}
