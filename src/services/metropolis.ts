import { CRITICAL_BETA_J } from "@/constants";
import { mergeLattices, SpinLattice } from "./spin-lattice";

/**
 * initialize
 *   lat(βJ_min, βh, βJ2)
 *   lat(βJ, h = 0, βJ2)
 *   lat(βJ, h, βJ2 = 0)
 *
 * sweep from planes
 *
 * For J2 > 0
 * lat(βJ, βh, βJ2, t=0) = E[
 *   lat(βJ - βΔJ, βh, βJ2),
 *   lat(βJ, βh - βΔh, βJ2),
 *   lat(βJ, βh - βΔh, βJ2 - βΔJ2, t=0),
 * ] (average or pick)
 *
 * For J2 < 0
 * lat(βJ, βh, βJ2, t=0) = E[
 *   lat(βJ - βΔJ, βh, βJ2),
 *   lat(βJ, βh - βΔh, βJ2),
 *   lat(βJ, βh - βΔh, βJ2 + βΔJ2, t=0),
 * ] (average or pick)
 *
 * @param lattice
 * @param betaJ
 * @param betaH
 * @returns
 */
export function simulateMetropoliseSweepLattice(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  betaJ2: number
) {
  const lat = new SpinLattice(lattice);
  const N = lattice.latticeSize; // Size of the lattice (N x N x N)
  for (let _ = 0; _ < N ** 3; _++) {
    const x = Math.floor(Math.random() * N);
    const y = Math.floor(Math.random() * N);
    const z = Math.floor(Math.random() * N);
    const oldEnergy = lat.betaEnergyOfSpinAt({ x, y, z }, betaJ, betaH, betaJ2);
    lat.flipSpin({ x, y, z });
    const newEnergy = lat.betaEnergyOfSpinAt({ x, y, z }, betaJ, betaH, betaJ2);
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
  sweeps: number,
  betaJ2: number
): SpinLattice {
  const result = Array.from({ length: sweeps }).reduce<SpinLattice>(
    (acc) => {
      return simulateMetropoliseSweepLattice(acc, betaJ, betaH, betaJ2);
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
  betaJs: readonly number[], // betaJ_min, ..., betaJ_max
  betaHs: readonly number[], // 0, ..., betaH
  j2j1ratios: readonly number[], // -J2/J1 Amplitude, ..., 0, ..., J2/J1 Amplitude
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
    j2j1ratio: number;
    betaEnergies: number[];
    magnetizations: number[];
    sweeps: number;
  }[][][] = Array.from({ length: betaJs.length }, () =>
    Array.from({ length: betaHs.length }, () =>
      Array.from({ length: j2j1ratios.length }, () => ({
        lattice: new SpinLattice(latticeSize),
        betaJ: 0,
        betaH: 0,
        j2j1ratio: 0,
        betaEnergies: [],
        magnetizations: [],
        sweeps: 0,
      }))
    )
  );

  // initialize lattice the lowest betaJ and betaH
  const betaJMinIndex = 0;
  const betaHZeroIndex = 0;
  const betaJ2ZeroIndex = (j2j1ratios.length - 1) / 2; // assuming j1j2ratios is odd length
  const sweeps = calcSweepsForMagnetic(betaJs[betaJMinIndex]);

  // initialize J=minJ, h=J2=0 point
  const initLattice = simulateMetropolis(
    SpinLattice.createRandom(latticeSize),
    betaJs[betaJMinIndex],
    betaHs[betaHZeroIndex],
    sweeps,
    j2j1ratios[betaJ2ZeroIndex]
  );
  const measurementResult = calculateMeasurements(
    initLattice,
    betaJs[betaJMinIndex],
    betaHs[betaHZeroIndex],
    j2j1ratios[betaJ2ZeroIndex], // use first j2j1 ratio value
    SWEEPS_MEASURE,
    SWEEPS_MEASURE_INTERVAL
  );

  result[betaJMinIndex][betaHZeroIndex][betaJ2ZeroIndex] = {
    lattice: initLattice,
    betaJ: betaJs[betaJMinIndex],
    betaH: betaHs[betaHZeroIndex],
    j2j1ratio: j2j1ratios[betaJ2ZeroIndex],
    sweeps: sweeps,
    ...measurementResult,
  };

  // initialize J line ( h=J2=0)
  (() => {
    let lattice = new SpinLattice(initLattice);
    // initialize positive betaJs and h[j=0]
    for (let i = betaJMinIndex + 1; i < betaJs.length; i++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[betaHZeroIndex];
      const betaJ2 = j2j1ratios[betaJ2ZeroIndex] * Math.abs(betaJ);

      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps, betaJ2);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[i][betaHZeroIndex][betaJ2ZeroIndex] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[betaJ2ZeroIndex],
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // initialize h line (J2=0, J=Jmin)
  (() => {
    let lattice = new SpinLattice(initLattice);
    // initialize positive betaHs and J[j=0]
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[betaJMinIndex];
      const betaH = betaHs[j];
      const betaJ2 = j2j1ratios[betaJ2ZeroIndex] * Math.abs(betaJ);
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps, betaJ2);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[betaJMinIndex][j][betaJ2ZeroIndex] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[betaJ2ZeroIndex],
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // next, initialize plane

  // initialize J2 line (h=0, J=Jmin) - positive J2 values
  (() => {
    let lattice = new SpinLattice(initLattice);
    for (let k = betaJ2ZeroIndex + 1; k < j2j1ratios.length; k++) {
      const betaJ = betaJs[betaJMinIndex];
      const betaH = betaHs[betaHZeroIndex];
      const betaJ2 = j2j1ratios[k] * Math.abs(betaJ);
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps, betaJ2);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[betaJMinIndex][betaHZeroIndex][k] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[k],
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // initialize J2 line (h=0, J=Jmin) - negative J2 values
  (() => {
    let lattice = new SpinLattice(initLattice);
    for (let k = betaJ2ZeroIndex - 1; k >= 0; k--) {
      const betaJ = betaJs[betaJMinIndex];
      const betaH = betaHs[betaHZeroIndex];
      const betaJ2 = j2j1ratios[k] * Math.abs(betaJ);
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps, betaJ2);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[betaJMinIndex][betaHZeroIndex][k] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[k],
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // initialize H line (J2=0, J=Jmin) - positive H values
  (() => {
    let lattice = new SpinLattice(initLattice);
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[betaJMinIndex];
      const betaH = betaHs[j];
      const betaJ2 = j2j1ratios[betaJ2ZeroIndex] * Math.abs(betaJ);
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      lattice = simulateMetropolis(lattice, betaJ, betaH, sweeps, betaJ2);
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[betaJMinIndex][j][betaJ2ZeroIndex] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[betaJ2ZeroIndex],
        sweeps,
        ...measurementResult,
      };
    }
  })();

  // sweep for positive betaJs and positive betaHs (J2=0)
  for (let i = betaJMinIndex + 1; i < betaJs.length; i++) {
    for (let j = betaHZeroIndex + 1; j < betaHs.length; j++) {
      const betaJ = betaJs[i];
      const betaH = betaHs[j];
      const betaJ2 = j2j1ratios[betaJ2ZeroIndex] * Math.abs(betaJ);
      const sweeps = calcSweepsForMagnetic(betaJ);
      console.time(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      const averageLattice = mergeLattices(
        result[i - 1][j][betaJ2ZeroIndex].lattice,
        result[i][j - 1][betaJ2ZeroIndex].lattice
      );

      const lattice = simulateMetropolis(
        averageLattice,
        betaJ,
        betaH,
        sweeps,
        betaJ2
      );
      const measurementResult = calculateMeasurements(
        lattice,
        betaJ,
        betaH,
        betaJ2,
        SWEEPS_MEASURE,
        SWEEPS_MEASURE_INTERVAL
      );
      console.timeEnd(
        `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
      );
      result[i][j][betaJ2ZeroIndex] = {
        lattice: new SpinLattice(lattice),
        betaJ,
        betaH,
        j2j1ratio: j2j1ratios[betaJ2ZeroIndex],
        sweeps,
        ...measurementResult,
      };
    }
  }

  // sweep for all betaJs, betaHs, and J2 values
  for (let i = 0; i < betaJs.length; i++) {
    for (let j = 0; j < betaHs.length; j++) {
      // Skip the points we've already computed
      if (
        (i === betaJMinIndex && j === betaHZeroIndex) ||
        (i > betaJMinIndex && j === betaHZeroIndex) ||
        (i === betaJMinIndex && j > betaHZeroIndex) ||
        (i > betaJMinIndex &&
          j > betaHZeroIndex &&
          betaJ2ZeroIndex === betaJ2ZeroIndex)
      ) {
        // Sweep positive J2 values
        for (let k = betaJ2ZeroIndex + 1; k < j2j1ratios.length; k++) {
          const betaJ = betaJs[i];
          const betaH = betaHs[j];
          const betaJ2 = j2j1ratios[k] * Math.abs(betaJ);
          const sweeps = calcSweepsForMagnetic(betaJ);

          console.time(
            `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
          );

          // Use the J2=0 point as starting lattice
          const startLattice = result[i][j][betaJ2ZeroIndex].lattice;
          const lattice = simulateMetropolis(
            startLattice,
            betaJ,
            betaH,
            sweeps,
            betaJ2
          );
          const measurementResult = calculateMeasurements(
            lattice,
            betaJ,
            betaH,
            betaJ2,
            SWEEPS_MEASURE,
            SWEEPS_MEASURE_INTERVAL
          );

          console.timeEnd(
            `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
          );

          result[i][j][k] = {
            lattice: new SpinLattice(lattice),
            betaJ,
            betaH,
            j2j1ratio: j2j1ratios[k],
            sweeps,
            ...measurementResult,
          };
        }

        // Sweep negative J2 values
        for (let k = betaJ2ZeroIndex - 1; k >= 0; k--) {
          const betaJ = betaJs[i];
          const betaH = betaHs[j];
          const betaJ2 = j2j1ratios[k] * Math.abs(betaJ);
          const sweeps = calcSweepsForMagnetic(betaJ);

          console.time(
            `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
          );

          // Use the J2=0 point as starting lattice
          const startLattice = result[i][j][betaJ2ZeroIndex].lattice;
          const lattice = simulateMetropolis(
            startLattice,
            betaJ,
            betaH,
            sweeps,
            betaJ2
          );
          const measurementResult = calculateMeasurements(
            lattice,
            betaJ,
            betaH,
            betaJ2,
            SWEEPS_MEASURE,
            SWEEPS_MEASURE_INTERVAL
          );

          console.timeEnd(
            `Simulating betaJ=${betaJ}, betaH=${betaH}, betaJ2=${betaJ2}, sweeps=${sweeps}`
          );

          result[i][j][k] = {
            lattice: new SpinLattice(lattice),
            betaJ,
            betaH,
            j2j1ratio: j2j1ratios[k],
            sweeps,
            ...measurementResult,
          };
        }
      }
    }
  }
  return result;
}

function calculateMeasurements(
  lattice: SpinLattice,
  betaJ: number,
  betaH: number,
  betaJ2: number,
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
        SWEEPS_MEASURE_INTERVAL,
        betaJ2
      );
      acc.betaEnergies.push(nextLattice.betaEnergy(betaJ, betaH, betaJ2));
      acc.magnetizations.push(nextLattice.magnetization());
      acc.lattice = nextLattice;
      return acc;
    },
    {
      betaEnergies: [lattice.betaEnergy(betaJ, betaH, betaJ2)],
      magnetizations: [lattice.magnetization()],
      lattice: lattice,
    }
  );
  return { betaEnergies, magnetizations };
}
