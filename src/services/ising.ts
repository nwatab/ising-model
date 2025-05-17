export type SpinArray = Int8Array & {
  readonly [index: number]: -1 | 1;
};

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

// Calculate total energy of the system

type CalculateSpinEnergy = (
  lat: SpinArray,
  x: number,
  y: number,
  z: number,
  N: number,
  betaJ: number,
  betaH: number,
  getIndex: (x: number, y: number, z: number, N: number) => number
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

export function simulateMsimulateMetropolistlopolis(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  calculateSpinEnergy: CalculateSpinEnergy
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
