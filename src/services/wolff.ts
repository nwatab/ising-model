import { GetIndexFn, SpinArray } from "@/types";

/**
 * Perform a single Wolff cluster step on the lattice.
 * Returns the number of spins flipped (cluster size).
 */
export function wolffStep(
  lat: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  getIndex: GetIndexFn
): number {
  // Skip cluster update if field is too strong relative to coupling
  if (Math.abs(betaH) > 10 * Math.abs(betaJ)) {
    // With strong field, just flip a single spin with Metropolis
    const x = Math.floor(Math.random() * N);
    const y = Math.floor(Math.random() * N);
    const z = Math.floor(Math.random() * N);
    const idx = getIndex(x, y, z, N);

    // Calculate energy change for this single spin flip
    const spin = lat[idx];
    const neighbors = [
      lat[getIndex(x + 1, y, z, N)],
      lat[getIndex(x - 1, y, z, N)],
      lat[getIndex(x, y + 1, z, N)],
      lat[getIndex(x, y - 1, z, N)],
      lat[getIndex(x, y, z + 1, N)],
      lat[getIndex(x, y, z - 1, N)],
    ];

    let deltaE = 0;
    for (const neighbor of neighbors) {
      deltaE += 2 * betaJ * spin * neighbor;
    }
    deltaE += 2 * betaH * spin;

    if (deltaE <= 0 || Math.random() < Math.exp(-deltaE)) {
      lat[idx] *= -1; // Flip the spin
      return 1;
    }
    return 0;
  }

  // Normal Wolff algorithm with field adjustment
  const stack: number[] = [];
  const visited = new Uint8Array(lat.length);
  const seedX = Math.floor(Math.random() * N);
  const seedY = Math.floor(Math.random() * N);
  const seedZ = Math.floor(Math.random() * N);
  const seedIdx = getIndex(seedX, seedY, seedZ, N);
  const seedSpin = lat[seedIdx];
  const isAntiferro = betaJ < 0;
  const absBetaJ = Math.abs(betaJ);
  const p_add = 1 - Math.exp(-2 * absBetaJ);

  stack.push(seedIdx);
  visited[seedIdx] = 1;
  let clusterSize = 0;

  // Calculate probability of accepting cluster flip with field
  const fieldFactor = 2 * betaH * seedSpin;

  while (stack.length) {
    const idx = stack.pop()!;
    clusterSize++;
    lat[idx] *= -1; // flip s

    // decode coords
    const z = Math.floor(idx / (N * N));
    const rem = idx % (N * N);
    const y = Math.floor(rem / N);
    const x = rem % N;

    // for antiferro we need ε(i), else 1
    const epsSeed = isAntiferro ? ((seedX + seedY + seedZ) & 1 ? -1 : 1) : +1;
    const tauSeed = epsSeed * seedSpin;

    for (const [dx, dy, dz] of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ] as const) {
      const nx = (x + dx + N) % N;
      const ny = (y + dy + N) % N;
      const nz = (z + dz + N) % N;
      const nIdx = getIndex(nx, ny, nz, N);
      if (visited[nIdx]) continue;

      // bond‐test:
      let sameCluster = false;
      if (isAntiferro) {
        const epsN = (nx + ny + nz) & 1 ? -1 : 1;
        const tauN = epsN * lat[nIdx];
        sameCluster = tauN === tauSeed;
      } else {
        sameCluster = lat[nIdx] === seedSpin;
      }

      if (sameCluster && Math.random() < p_add) {
        visited[nIdx] = 1;
        stack.push(nIdx);
      }
    }
  }

  // With an external field, we need a global Metropolis-like acceptance step
  // Reject the entire cluster flip with probability min(1, exp(-2*h*M))
  // where M is magnetization of cluster (just the cluster size times the seed spin)
  if (betaH !== 0) {
    const deltaE = fieldFactor * clusterSize;
    if (deltaE > 0 && Math.random() > Math.exp(-deltaE)) {
      // Reject the flip - revert all the spins in the cluster
      for (let i = 0; i < visited.length; i++) {
        if (visited[i]) {
          lat[i] *= -1;
        }
      }
      return 0; // No spins were effectively flipped
    }
  }

  return clusterSize;
}

/**
 * Run many Wolff steps to equilibrate.
 */
export function simulateWolff(
  lattice: SpinArray,
  betaJ: number,
  betaH: number,
  N: number,
  steps: number,
  getIndex: GetIndexFn
): SpinArray {
  const lat = new Int8Array(lattice) as SpinArray;
  for (let i = 0; i < steps; i++) {
    wolffStep(lat, betaJ, betaH, N, getIndex);
  }
  return lat;
}

/**
 * Dynamically determine the number of Wolff steps needed for equilibration
 * based on system parameters
 *
 * @param betaJ - Coupling strength J/kBT
 * @param betaH - External field strength h/kBT
 * @param N - Linear dimension of lattice (N×N×N)
 * @returns Number of Wolff steps recommended for equilibration
 */
export function determineWolffSteps(
  betaJ: number,
  betaH: number,
  N: number
): number {
  const criticalBetaJ = 0.221; // Critical point for 3D Ising
  const distanceFromCritical = Math.abs(Math.abs(betaJ) - criticalBetaJ);

  // Base steps scaled with system size (logarithmically)
  // For N=32 this gives ~10 as the base steps
  const baseSteps = Math.ceil(5 * Math.log2(N));

  // Factors that increase needed steps
  let stepMultiplier = 1.0;

  // 1. Proximity to critical point
  if (distanceFromCritical < 0.02) {
    stepMultiplier *= 4.0; // Very close to critical point
  } else if (distanceFromCritical < 0.05) {
    stepMultiplier *= 3.0; // Near critical point
  } else if (distanceFromCritical < 0.1) {
    stepMultiplier *= 2.0; // Somewhat near critical point
  }

  // 2. Magnetic field effects
  // External field breaks symmetry and can slow down equilibration
  const absBetaH = Math.abs(betaH);
  if (absBetaH > 0.1) {
    stepMultiplier *= 1.3; // Stronger field effects
  } else if (absBetaH > 0.05) {
    stepMultiplier *= 1.2; // Moderate field effects
  } else if (absBetaH > 0.01) {
    stepMultiplier *= 1.1; // Weak field effects
  }

  // 3. For anti-ferromagnetic coupling
  if (betaJ < 0) {
    stepMultiplier *= 1.2; // Anti-ferromagnetic couplings typically need more steps
  }

  // 4. For very large systems, we need proportionally fewer steps
  // because each step flips more spins
  const sizeDiscountFactor =
    N <= 16 ? 1.0 : N <= 32 ? 0.9 : N <= 64 ? 0.8 : 0.7;

  return Math.ceil(baseSteps * stepMultiplier * sizeDiscountFactor);
}
