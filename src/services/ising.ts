import { SpinArray } from "@/types";

export const getIndex = (
  x: number,
  y: number,
  z: number,
  N: number
): number => {
  // Apply periodic boundary conditions
  const nx = ((x % N) + N) % N;
  const ny = ((y % N) + N) % N;
  const nz = ((z % N) + N) % N;
  return nz * N * N + ny * N + nx;
};

export const initializeRandomLattice = (N: number) => {
  const newLattice = new Int8Array(N * N * N);
  // Create a checkerboard pattern
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // Use a deterministic pattern instead of random for SSG
        newLattice[getIndex(x, y, z, N)] = Math.random() < 0.5 ? -1 : 1;
      }
    }
  }
  return newLattice as SpinArray;
};

export const calculateTotalEnergy = (
  lat: SpinArray,
  betaJ: number,
  betaH: number,
  N: number
): number => {
  let totalEnergy = 0;

  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // Count only half the bonds to avoid double-counting
        const spin = lat[getIndex(x, y, z, N)];
        const rightNeighbor = lat[getIndex(x + 1, y, z, N)];
        const downNeighbor = lat[getIndex(x, y + 1, z, N)];
        const backNeighbor = lat[getIndex(x, y, z + 1, N)];

        totalEnergy -= betaJ * spin * rightNeighbor;
        totalEnergy -= betaJ * spin * downNeighbor;
        totalEnergy -= betaJ * spin * backNeighbor;
        totalEnergy -= betaH * spin;
      }
    }
  }

  return totalEnergy;
};

export const calculateMagnetization = (lat: SpinArray): number => {
  const sumMagnetization = lat.reduce((acc, spin) => acc + spin, 0);
  return sumMagnetization / lat.length;
};
