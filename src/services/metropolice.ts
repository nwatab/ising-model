import { GetIndexFn, SpinArray } from "@/types";
import {
  calculateMagnetization,
  calculateTotalEnergy,
  getIndex,
  initializeRandomLattice,
} from "./ising";
import { CRITICAL_BETA_J } from "@/config";

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
  const nu = 0.63;
  const z = 2;
  const tau = Math.abs(betaJ - CRITICAL_BETA_J) ** (-nu * z);
  const C = 5;
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
) {
  const SWEEPS_PARAMAGNETIC = 20;
  const SWEEPS_ANTIFERROMAGNETIC = 40;
  const SWEEPS_FERROMAGNETIC = SWEEPS_ANTIFERROMAGNETIC;
  const SWEEPS_CRITICAL = 500;
  const SWEEPS_MEASURE = 10; // to measure the energy and magnetization
  const SWEEPS_MEASURE_INTERVAL = 1;
  // initialize [betaJs length][betaHs length]
  const result: {
    lattice: SpinArray;
    betaJ: number;
    betaH: number;
    energy: number;
    magnetization: number;
    stdevEnergy: number;
    stdevMagnetization: number;
  }[][] = Array.from({ length: betaJs.length }, () =>
    Array.from({ length: betaHs.length }, () => ({
      lattice: new Int8Array(N ** 3) as SpinArray,
      betaJ: 0,
      betaH: 0,
      energy: 0,
      magnetization: 0,
      stdevEnergy: 0,
      stdevMagnetization: 0,
    }))
  );
  // initialize lattice where J =0 and h = 0
  const initLattice = initializeRandomLattice(N);
  const betaJZeroIndex = (betaJs.length - 1) / 2;
  const betaHZeroIndex = (betaHs.length - 1) / 2;
  const measurementResult = calculateMeasurements(
    initLattice,
    0,
    0,
    N,
    SWEEPS_MEASURE,
    SWEEPS_MEASURE_INTERVAL
  );
  result[betaJZeroIndex][betaHZeroIndex] = {
    lattice: initLattice,
    betaJ: 0,
    betaH: 0,
    ...measurementResult,
  };

  // initialize positive betaJs and h = 0
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = estimateSweeps(betaJ);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);
    const measurementResult = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE,
      SWEEPS_MEASURE_INTERVAL
    );
    result[i][betaHZeroIndex] = {
      lattice,
      betaJ,
      betaH,
      ...measurementResult,
    };
  }

  // initialize negative betaJs and h = 0
  for (let i = betaJZeroIndex - 1; i >= 0; i--) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = estimateSweeps(betaJ);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);

    const measurementResult = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE,
      SWEEPS_MEASURE_INTERVAL
    );
    result[i][betaHZeroIndex] = {
      lattice,
      betaJ,
      betaH,
      ...measurementResult,
    };
  }
  // initialize betaJs = 0 and positive betaHs
  for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = estimateSweeps(betaH);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);
    const measurementResult = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE,
      SWEEPS_MEASURE_INTERVAL
    );
    result[betaJZeroIndex][j] = {
      lattice,
      betaJ,
      betaH,
      ...measurementResult,
    };
  }
  // initialize betaJs = 0 and negative betaHs
  for (let j = betaHZeroIndex - 1; j >= 0; j--) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = estimateSweeps(betaH);
    const lattice = simulateMetropolis(initLattice, betaJ, betaH, N, sweeps);
    const measurementResult = calculateMeasurements(
      lattice,
      betaJ,
      betaH,
      N,
      SWEEPS_MEASURE,
      SWEEPS_MEASURE_INTERVAL
    );
    result[betaJZeroIndex][j] = {
      lattice,
      betaJ,
      betaH,
      ...measurementResult,
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
        Math.abs(betaJ - CRITICAL_BETA_J) < 0.1
          ? SWEEPS_CRITICAL
          : betaJ < CRITICAL_BETA_J
            ? SWEEPS_PARAMAGNETIC
            : SWEEPS_FERROMAGNETIC;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH,
        N,
        sweeps
      );
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        ...measurementResult,
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
        Math.abs(betaJ - CRITICAL_BETA_J) < 0.1
          ? SWEEPS_CRITICAL
          : betaJ < CRITICAL_BETA_J
            ? SWEEPS_PARAMAGNETIC
            : SWEEPS_FERROMAGNETIC;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH,
        N,
        sweeps
      );
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        ...measurementResult,
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
        Math.abs(betaJ + CRITICAL_BETA_J) < 0.1
          ? SWEEPS_CRITICAL
          : betaJ < CRITICAL_BETA_J
            ? SWEEPS_ANTIFERROMAGNETIC
            : SWEEPS_PARAMAGNETIC;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH,
        N,
        sweeps
      );
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        ...measurementResult,
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
        Math.abs(betaJ + CRITICAL_BETA_J) < 0.1
          ? SWEEPS_CRITICAL
          : betaJ < -CRITICAL_BETA_J
            ? SWEEPS_ANTIFERROMAGNETIC
            : SWEEPS_PARAMAGNETIC;
      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH,
        N,
        sweeps
      );
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      result[i][j] = {
        lattice,
        betaJ,
        betaH,
        ...measurementResult,
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
  SWEEPS_MEASURE: number,
  SWEEPS_MEASURE_INTERVAL: number
) {
  const { energies, magnetizations } = Array.from<{
    energies: number[];
    magnetizations: number[];
    lattices: SpinArray[];
    lattice: SpinArray;
  }>({
    length: SWEEPS_MEASURE - 1,
  }).reduce(
    (acc) => {
      const nextLattice = simulateMetropolis(
        lattice,
        betaJ,
        betaH,
        N,
        SWEEPS_MEASURE_INTERVAL
      );
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
  const stdevEnergy = Math.sqrt(
    energies.reduce((a, b) => a + (b - energy) ** 2, 0) / (energies.length - 1)
  );
  const stdevMagnetization = Math.sqrt(
    magnetizations.reduce((a, b) => a + (b - magnetization) ** 2, 0) /
      (magnetizations.length - 1)
  );

  return {
    energy,
    magnetization,
    stdevEnergy,
    stdevMagnetization,
  };
}

export function flipMagnetizationDirection(lattice: SpinArray, spin: 1 | -1) {
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
