import { CRITICAL_BETA_J } from "@/constants";
import { mergeLatices, SpinLattice } from "./spin-lattice";

export function simulateMetropoliseSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number
) {
  const lat = new SpinLattice(lattice);
  const N = lattice.latticeSize; // Size of the lattice (N x N x N)
  for (let _ = 0; _ < N ** 3; _++) {
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
  sweeps: number
): SpinLattice {
  const result = Array.from({ length: sweeps }).reduce<SpinLattice>(
    (acc) => {
      return simulateMetropoliseSweepLattice(acc, betaJ, betaH);
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
 * @param latticeSize - Size of the lattice (N x N x N).
 * @returns A 2D array of SpinArray representing the lattice at each (betaJ, betaH) point.
 */
export function sweepEnergiesMetropolis(
  betaJs: readonly number[], // 0, ..., betaJ
  betaHs: readonly number[], // 0, ..., betaH
  latticeSize: number
) {
  const SWEEPS_PARAMAGNETIC = 100;
  const SWEEPS_ANTIFERROMAGNETIC = 100;
  const SWEEPS_FERROMAGNETIC = 100;
  const SWEEPS_CRITICAL = 800;
  const SWEEPS_MEASURE = 10; // to measure the energy and magnetization
  const SWEEPS_MEASURE_INTERVAL = 5;

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
    betaEnergies: number[];
    magnetizations: number[];
    sweeps: number;
  }[][] = Array.from({ length: betaJs.length }, () =>
    Array.from({ length: betaHs.length }, () => ({
      lattice: new SpinLattice(latticeSize),
      betaJ: 0,
      betaH: 0,
      betaEnergies: [],
      magnetizations: [],
      sweeps: 0,
    }))
  );
  // initialize lattice the lowest betaJ and betaH
  const betaJZeroIndex = 0;
  const betaHZeroIndex = 0;
  const sweeps = calcSweepsForMagnetic(betaJs[betaJZeroIndex]);
  const initLattice = simulateMetropolis(
    SpinLattice.createRandom(latticeSize),
    betaJs[betaJZeroIndex],
    betaHs[betaHZeroIndex],
    sweeps
  );

  const measurementResult = calculateMeasurements(
    initLattice,
    betaJs[betaJZeroIndex],
    betaHs[betaHZeroIndex],
    SWEEPS_MEASURE,
    SWEEPS_MEASURE_INTERVAL
  );
  result[betaJZeroIndex][betaHZeroIndex] = {
    lattice: initLattice,
    betaJ: betaJs[betaJZeroIndex],
    betaH: betaHs[betaHZeroIndex],
    sweeps: sweeps,
    ...measurementResult,
  };
  (() => {
    let lattice = new SpinLattice(initLattice);
    // initialize positive betaJs and h[j=0]
    for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[betaHZeroIndex];

      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      result[i][betaHZeroIndex] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // initialize betaJs[i = 0] and positive betaHs
  (() => {
    let lattice = new SpinLattice(initLattice);
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[betaJZeroIndex];
      const betaH = betaHs[j];
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      result[betaJZeroIndex][j] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // sweep for positive betaJs and positive betaHs
  for (let i = betaJZeroIndex + 1; i < betaJs.length; i++) {
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      const averageLattice = mergeLatices(
        result[i - 1][j].lattice,
        result[i][j - 1].lattice
      );

      const lattice = simulateMetropolis(averageLattice, betaJ, betaH, sweeps);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, sweeps=${sweeps}`
      );
      result[i][j] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        sweeps,
        ...measurementResult,
      };
    }
  }
  return result;
}

function calculateMeasurements(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  SWEEPS_MEASURE: number,
  SWEEPS_MEASURE_INTERVAL: number
) {
  const { betaEnergies, magnetizations } = Array.from<{
    energies: number[];
    magnetizations: number[];
    lattice: SpinLattice;
  }>({
    length: SWEEPS_MEASURE - 1,
  }).reduce(
    (acc) => {
      const nextLattice = simulateMetropolis(
        acc.lattice,
        betaJ,
        betaH,
        SWEEPS_MEASURE_INTERVAL
      );
      acc.betaEnergies.push(nextLattice.betaEnergy(betaJ, betaH));
      acc.magnetizations.push(nextLattice.magnetization());
      acc.lattice = nextLattice;
      return acc;
    },
    {
      betaEnergies: [lattice.betaEnergy(betaJ, betaH)],
      magnetizations: [lattice.magnetization()],
      lattice: lattice,
    }
  );
  return { betaEnergies, magnetizations };
}
