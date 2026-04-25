import { SpinLattice } from "./spin-lattice";

export function simulateMetropoliseSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number
) {
  const lat = new SpinLattice(lattice);
  const N = lattice.latticeSize;
  for (let _ = 0; _ < N ** 3; _++) {
    const x = Math.floor(Math.random() * N);
    const y = Math.floor(Math.random() * N);
    const z = Math.floor(Math.random() * N);
    const oldEnergy = lat.energyAt({ x, y, z }, betaJ, betaH);
    lat.flipSpin({ x, y, z });
    const newEnergy = lat.energyAt({ x, y, z }, betaJ, betaH);
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
  betaH: number,
  sweeps: number
): SpinLattice {
  return Array.from({ length: sweeps }).reduce<SpinLattice>(
    (acc) => simulateMetropoliseSweepLattice(acc, betaJ, betaH),
    new SpinLattice(lattice)
  );
}
