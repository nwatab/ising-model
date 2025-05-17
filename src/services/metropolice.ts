import { GetIndexFn, SpinArray } from "@/types";

type CalculateSpinEnergy = (
  lat: SpinArray,
  x: number,
  y: number,
  z: number,
  N: number,
  betaJ: number,
  betaH: number,
  getIndex: GetIndexFn
) => number;

export const calculateSpinEnergy: CalculateSpinEnergy = (
  lat,
  x,
  y,
  z,
  N,
  betaJ,
  betaH,
  getIndex
) => {
  const idx = getIndex(x, y, z, N);
  const spin = lat[idx];
  const neighbors = [
    lat[getIndex(x + 1, y, z, N)],
    lat[getIndex(x - 1, y, z, N)],
    lat[getIndex(x, y + 1, z, N)],
    lat[getIndex(x, y - 1, z, N)],
    lat[getIndex(x, y, z + 1, N)],
    lat[getIndex(x, y, z - 1, N)],
  ];

  // Calculate energy using dimensionless parameters
  // E = -J * sum(s_i * s_j) - h * s_i
  // => βE = -(J/kBT) * sum(s_i * s_j) - (h/kBT) * s_i
  let energy = 0;
  for (const neighbor of neighbors) {
    energy -= betaJ * spin * neighbor;
  }
  energy -= betaH * spin;

  return energy;
};

/**
 * @deprecated
 */
export function simulateMsimulateMetropolistlopolis(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  calculateSpinEnergy: CalculateSpinEnergy,
  getIndex: GetIndexFn
): SpinArray {
  const lat = new Int8Array(lattice) as SpinArray;
  // Simulate Metropolis algorithm (N^5) times
  for (let i = 0; i < N ** 2; i++) {
    // flip spins for N^3 times randomly.
    for (let j = 0; j < N ** 3; j++) {
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      const z = Math.floor(Math.random() * N);
      const idx = getIndex(x, y, z, N);

      const oldEnergy = calculateSpinEnergy(
        lat,
        x,
        y,
        z,
        N,
        betaJ,
        betaH,
        getIndex
      );
      lat[idx] *= -1; // Flip the spin
      const newEnergy = calculateSpinEnergy(
        lat,
        x,
        y,
        z,
        N,
        betaJ,
        betaH,
        getIndex
      );
      const deltaEnergy = newEnergy - oldEnergy;
      const acceptProbability = Math.exp(-deltaEnergy);
      if (deltaEnergy > 0 && Math.random() > acceptProbability) {
        lat[idx] *= -1; // Revert the spin flip
      }
    }
  }

  return lat as SpinArray;
}
