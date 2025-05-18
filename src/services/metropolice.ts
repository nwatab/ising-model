import { GetIndexFn, SpinArray } from "@/types";
import { getIndex } from "./ising";

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

export function simulateMetropoliseSweep(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  calculateSpinEnergy: CalculateSpinEnergy,
  getIndex: GetIndexFn
) {
  const lat = new Int8Array(lattice) as SpinArray;
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
  return lat;
}

export function simulateMetropolis(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  sweeps: number
): SpinArray {
  const result = Array.from({ length: sweeps }).reduce<SpinArray>(
    (acc) => {
      return simulateMetropoliseSweep(
        acc,
        betaJ,
        betaH,
        N,
        calculateSpinEnergy,
        getIndex
      );
    },
    new Int8Array(lattice) as SpinArray
  );

  return result;
}
/**
 * Estimate the number of sweeps needed for convergence.
 */
export function estimateSweeps(betaJ: number): number {
  const betaJc = 0.221654;
  const nu = 0.63;
  const z = 2;
  const tau = Math.abs(betaJ - betaJc) ** (-nu * z);
  const C = 10;
  const sweeps = C * tau;
  return Math.trunc(sweeps);
}
