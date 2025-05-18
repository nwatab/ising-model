import { GetIndexFn, SpinArray } from "@/types";
import {
  calculateMagnetization,
  calculateTotalEnergy,
  getIndex,
  initializeRandomLattice,
} from "./ising";

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

export function simulateMetropoliseSweepLattice(
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
      return simulateMetropoliseSweepLattice(
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

/**
 * Sweep the lattice in a 3D Ising model using the Metropolis algorithm.
 * @param betaJs - Array of betaJ values. The center value is 0.
 * @param betaHs - Array of betaH values. The center value is 0.
 * @param N - Size of the lattice (N x N x N).
 * @returns A 2D array of SpinArray representing the lattice at each (betaJ, betaH) point.
 */
export function sweepEnergiesMetropolis(
  betaJs: readonly number[], // -betaJ, ..., 0, ..., betaJ
  betaHs: readonly number[], // -betaH, ..., 0, ..., betaH
  N: number
): {
  lattice: SpinArray;
  betaJ: number;
  betaH: number;
  energy: number;
  magnetization: number;
}[][] {
  const deltaBetaH = 0; // small value to fall down to +1 for spontaneous symmetry breaking. zero for now.
  const SWEEPS = 200;
  const SWEEPS_NEAR_CRITICAL = 800;
  const SWEEPS_MEASURE = 10; // to measure the energy and magnetization
  const spontaneousSymmetryBreakingSign = 1;
  // initialize [betaJs length][betaHs length]
  const result: {
    lattice: SpinArray;
    betaJ: number;
    betaH: number;
    energy: number;
    magnetization: number;
  }[][] = Array.from({ length: betaJs.length }, () =>
    Array.from({ length: betaHs.length }, () => ({
      lattice: new Int8Array(N ** 3) as SpinArray,
      betaJ: 0,
      betaH: 0,
      energy: 0,
      magnetization: 0,
    }))
  );
  // initialize lattice where J =0 and h = 0
  const initLattice = initializeRandomLattice(N);
  const betaJZeroIndex = (betaJs.length - 1) / 2;
  const betaHZeroIndex = (betaHs.length - 1) / 2;
  const initMagnetization = calculateMagnetization(initLattice);
  result[betaJZeroIndex][betaHZeroIndex] = {
    lattice: initLattice,
    betaJ: 0,
    betaH: 0,
    energy: 0,
    magnetization: initMagnetization,
  };

  // initialize positive betaJs and h = 0
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = estimateSweeps(betaJ);
    const simLattice = simulateMetropolis(
      initLattice,
      betaJ,
      betaH + deltaBetaH,
      N,
      sweeps
    );
    const lattice =
      betaJ > 0.22
        ? flipMagnetizationDirection(
            simLattice,
            spontaneousSymmetryBreakingSign
          )
        : simLattice;
    const { energy, magnetization } = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE
    );
    result[i][betaHZeroIndex] = {
      lattice,
      betaJ,
      betaH,
      energy,
      magnetization,
    };
  }

  // initialize negative betaJs and h = 0
  for (let i = betaJZeroIndex - 1; i >= 0; i--) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = estimateSweeps(betaJ);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);

    const { energy, magnetization } = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE
    );
    result[i][betaHZeroIndex] = {
      lattice,
      betaJ,
      betaH,
      energy,
      magnetization,
    };
  }
  // initialize betaJs = 0 and positive betaHs
  for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = estimateSweeps(betaH);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);
    const { energy, magnetization } = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE
    );
    result[betaJZeroIndex][j] = {
      lattice,
      betaJ,
      betaH,
      energy,
      magnetization,
    };
  }
  // initialize betaJs = 0 and negative betaHs
  for (let j = betaHZeroIndex - 1; j >= 0; j--) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = estimateSweeps(betaH);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);
    const { energy, magnetization } = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE
    );
    result[betaJZeroIndex][j] = {
      lattice,
      betaJ,
      betaH,
      energy,
      magnetization,
    };
  }
  // sweep for positive betaJs and positive betaHs
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const averageLattice = averageLatices(
        result[i - 1][j].lattice,
        result[i][j - 1].lattice
      );
      const sweeps =
        Math.abs(betaJ - 0.22) < 0.2 ? SWEEPS_NEAR_CRITICAL : SWEEPS;
      const simLattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH + deltaBetaH,
        N,
        sweeps
      );
      const lattice =
        betaJ > 0.22
          ? flipMagnetizationDirection(
              simLattice,
              spontaneousSymmetryBreakingSign
            )
          : simLattice;
      const { energy, magnetization } = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        energy,
        magnetization,
      };
    }
  }

  // sweep for positive betaJs and negative betaHs
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    for (let j = betaHZeroIndex - 1; j >= 0; j--) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const averageLattice = averageLatices(
        result[i - 1][j].lattice,
        result[i][j + 1].lattice
      );
      const sweeps =
        Math.abs(betaJ - 0.22) < 0.2 ? SWEEPS_NEAR_CRITICAL : SWEEPS;
      const simLattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH + deltaBetaH,
        N,
        sweeps
      );
      const lattice =
        betaJ > 0.22
          ? flipMagnetizationDirection(
              simLattice,
              spontaneousSymmetryBreakingSign
            )
          : simLattice;
      const { energy, magnetization } = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        energy,
        magnetization,
      };
    }
  }

  // sweep for negative betaJs and positive betaHs
  for (let i = betaJZeroIndex - 1; i >= 0; i--) {
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const averageLattice = averageLatices(
        result[i + 1][j].lattice,
        result[i][j - 1].lattice
      );
      const sweeps =
        Math.abs(betaJ + 0.22) < 0.2 ? SWEEPS_NEAR_CRITICAL : SWEEPS;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH + deltaBetaH,
        N,
        sweeps
      );
      const { energy, magnetization } = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        energy,
        magnetization,
      };
    }
  }
  // sweep for negative betaJs and negative betaHs
  for (let i = betaJZeroIndex - 1; i >= 0; i--) {
    for (let j = betaHZeroIndex - 1; j >= 0; j--) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const averageLattice = averageLatices(
        result[i + 1][j].lattice,
        result[i][j + 1].lattice
      );
      const sweeps =
        Math.abs(betaJ + 0.22) < 0.2 ? SWEEPS_NEAR_CRITICAL : SWEEPS;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH + deltaBetaH,
        N,
        sweeps
      );
      const { energy, magnetization } = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        energy,
        magnetization,
      };
    }
  }
  return result;
}

function averageLatices(latticeA: SpinArray, latticeB: SpinArray) {
  const ave = latticeA
    .map((_, k) => (latticeA[k] + latticeB[k]) / 2)
    .map((spin) => {
      if (spin === 0) {
        return Math.random() < 0.5 ? 1 : -1;
      }
      return spin;
    }) as SpinArray;
  return ave;
}

function calculateMeasurements(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  SWEEPS_MEASURE: number
) {
  const { energies, magnetizations } = Array.from<{
    energies: number[];
    magnetizations: number[];
    lattices: SpinArray[];
  }>({
    length: SWEEPS_MEASURE - 1,
  }).reduce(
    (acc) => {
      const nextLattice = simulateMetropolis(lattice, betaJ, betaH, N, 1);
      acc.energies.push(calculateTotalEnergy(nextLattice, betaJ, betaH, N));
      acc.magnetizations.push(calculateMagnetization(nextLattice));
      acc.lattices.push(nextLattice);
      return acc;
    },
    {
      energies: [calculateTotalEnergy(lattice, betaJ, betaH, N)],
      magnetizations: [calculateMagnetization(lattice)],
      lattices: [lattice],
    }
  );
  const energy = energies.reduce((a, b) => a + b, 0) / energies.length;
  const magnetization =
    magnetizations.reduce((a, b) => a + b, 0) / magnetizations.length;
  return {
    energy,
    magnetization,
  };
}

function flipMagnetizationDirection(lattice: SpinArray, spin: 1 | -1) {
  const netMagnetization = lattice.reduce((a, b) => a + b, 0);
  const mSign = Math.sign(netMagnetization);

  // If magnetization is already in the desired direction or too close to zero, return
  if (mSign === spin || Math.abs(netMagnetization) < lattice.length * 0.05) {
    return lattice;
  }

  // Flip all spins if magnetization is in the wrong direction
  const flippedLattice = lattice.map((s) => -s) as SpinArray;
  return flippedLattice;
}
