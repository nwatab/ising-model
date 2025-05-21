import { CRITICAL_BETA_J } from "@/config";
import { SpinLattice } from "./spin-lattice";

export function simulateMetropoliseSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  N: number
) {
  const lat = new SpinLattice(lattice);
  for (let j = 0; j < N ** 3; j++) {
    const x = Math.floor(Math.random() * N);
    const y = Math.floor(Math.random() * N);
    const z = Math.floor(Math.random() * N);
    const oldEnergy = lat.energyAt({ x, y, z }, betaJ, betaH);
    lat.flipSpin({ x, y, z });
    const newEnergy = lat.energyAt({ x, y, z }, betaJ, betaH);
    const deltaEnergy = newEnergy - oldEnergy;
    const acceptProbability = Math.exp(-deltaEnergy);
    if (deltaEnergy > 0 && Math.random() > acceptProbability) {
      lat.flipSpin({ x, y, z }); // Revert the spin flip
    }
  }
  return lat;
}

export function simulateMetropolis(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  N: number,
  sweeps: number
): SpinLattice {
  const result = Array.from({ length: sweeps }).reduce<SpinLattice>(
    (acc) => {
      return simulateMetropoliseSweepLattice(acc, betaJ, betaH, N);
    },
    new SpinLattice(lattice) as SpinLattice
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
  const SWEEPS_PARAMAGNETIC = 100;
  const SWEEPS_ANTIFERROMAGNETIC = 100;
  const SWEEPS_FERROMAGNETIC = 100;
  const SWEEPS_CRITICAL = 800;
  const SWEEPS_MEASURE = 12; // to measure the energy and magnetization
  const SWEEPS_MEASURE_INTERVAL = 1;

  function calcSweepsForMagnetic(betaJ: number) {
    if (betaJ < 0) {
      return SWEEPS_ANTIFERROMAGNETIC;
    }
    if (betaJ === 0) {
      return estimateSweeps(betaJ);
    }
    if (betaJ < CRITICAL_BETA_J - 0.5) {
      return SWEEPS_PARAMAGNETIC;
    }
    if (betaJ < CRITICAL_BETA_J + 0.5) {
      return SWEEPS_CRITICAL;
    }
    return SWEEPS_FERROMAGNETIC;
  }
  // initialize [betaJs length][betaHs length]
  const result: {
    lattice: SpinLattice;
    betaJ: number;
    betaH: number;
    energy: number;
    magnetization: number;
    stdevEnergy: number;
    stdevMagnetization: number;
    sweeps: number;
  }[][] = Array.from({ length: betaJs.length }, () =>
    Array.from({ length: betaHs.length }, () => ({
      lattice: new SpinLattice(N),
      betaJ: 0,
      betaH: 0,
      energy: 0,
      magnetization: 0,
      stdevEnergy: 0,
      stdevMagnetization: 0,
      sweeps: 0,
    }))
  );
  // initialize lattice where J =0 and h = 0
  const initLattice = SpinLattice.createRandom(N);
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
    sweeps: 0,
    ...measurementResult,
  };

  // initialize positive betaJs and h = 0
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = calcSweepsForMagnetic(betaJ);
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
      sweeps,
      ...measurementResult,
    };
  }

  // initialize negative betaJs and h = 0
  for (let i = betaJZeroIndex - 1; i >= 0; i--) {
    const betaJ = betaJs[i];
    const betaH = 0;
    const sweeps = calcSweepsForMagnetic(betaJ);
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
      sweeps,
      ...measurementResult,
    };
  }
  // initialize betaJs = 0 and positive betaHs
  for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = calcSweepsForMagnetic(betaJ);
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
      sweeps,
      ...measurementResult,
    };
  }
  // initialize betaJs = 0 and negative betaHs
  for (let j = betaHZeroIndex - 1; j >= 0; j--) {
    const betaJ = 0;
    const betaH = betaHs[j];
    const sweeps = calcSweepsForMagnetic(betaJ);
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
      sweeps,
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
      const sweeps = calcSweepsForMagnetic(betaJ);
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
        sweeps,
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
      const sweeps = calcSweepsForMagnetic(betaJ);
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
        sweeps,
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
      const sweeps = calcSweepsForMagnetic(betaJ);
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
        sweeps,
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
      const sweeps = calcSweepsForMagnetic(betaJ);
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
        sweeps,
        ...measurementResult,
      };
    }
  }
  return result;
}

function averageLatices(A: SpinLattice, B: SpinLattice): SpinLattice {
  const N3 = A.length;
  const out = new SpinLattice(A);
  for (let idx = 0; idx < N3; idx++) {
    const sum = A[idx] + B[idx];
    // when sum===0, pick random ±1; else take sign
    out[idx] = sum === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(sum);
  }
  return out;
}

function calculateMeasurements(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  N: number,
  SWEEPS_MEASURE: number,
  SWEEPS_MEASURE_INTERVAL: number
) {
  const { energies, magnetizations } = Array.from<{
    energies: number[];
    magnetizations: number[];
    lattices: SpinLattice[];
    lattice: SpinLattice;
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
      acc.energies.push(nextLattice.energy(betaJ, betaH));
      acc.magnetizations.push(nextLattice.magnetization());
      acc.lattices.push(nextLattice);
      return acc;
    },
    {
      energies: [lattice.energy(betaJ, betaH)],
      magnetizations: [lattice.magnetization()],
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

export function flipMagnetizationDirection(lattice: SpinLattice, spin: 1 | -1) {
  const netMagnetization = lattice.reduce((a, b) => a + b, 0);
  const mSign = Math.sign(netMagnetization);

  // If magnetization is already in the desired direction or too close to zero, return
  if (mSign === spin || Math.abs(netMagnetization) < lattice.length * 0.05) {
    return lattice;
  }

  // Flip all spins if magnetization is in the wrong direction
  const flippedLattice = lattice.map((s) => -s) as SpinLattice;
  return flippedLattice;
}
