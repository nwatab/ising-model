/**
 * Pre-compute phase diagram data: sweep (J₂/J₁, T*) for both J₁ signs.
 * Uses Parallel Tempering: all T* replicas for a given J₂/J₁ run together
 * and exchange configurations, so high-T replicas seed low-T ones across
 * energy barriers — critical for the frustrated (Striped) regime.
 *
 * Outputs src/data/phase-diagram.json
 * Usage:  pnpm run phase-diagram [--N=16]
 */
import "tsconfig-paths/register.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { sublatticeSweepLattice } from "../services/metropolis";
import { SpinLattice } from "../services/spin-lattice";
import type { PhaseDiagramData, PhaseDiagramEntry } from "@/types";

const SWEEPS_THERM      = 3000;  // thermalization sweeps per replica
const SWEEPS_MEAS       = 60;    // measurement samples
const SWEEPS_MEAS_INTERVAL = 5;  // sweeps between samples
const SWAP_INTERVAL     = 5;     // replica-exchange attempt every N sweeps

const J2_OVER_J1_VALUES = [-1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const T_STAR_VALUES     = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.51, 5.0, 5.5, 6.0, 7.0, 8.0];

// Seed from the expected ordered state. Above Tc the seed decays during
// thermalization; below Tc it stays near the ordered state from the start.
function makeInitialLattice(N: number, jSign: 1 | -1, j2OverJ1: number): SpinLattice {
  // Phase boundaries (T=0 ground state):
  //   jSign=+1: FM for j2/j1 > -0.25, single-axis Stripe for j2/j1 < -0.25
  //   jSign=-1: Néel for j2/j1 < +0.25, diagonal Stripe (-1)^(y+z) for j2/j1 > +0.25
  if (jSign > 0 && j2OverJ1 < -0.25) return SpinLattice.createLayered(N);
  if (jSign < 0 && j2OverJ1 > 0.25)  return SpinLattice.createDiagonalLayered(N);
  if (jSign < 0)                       return SpinLattice.createNeel(N);
  return SpinLattice.createFerro(N);
}

type Replica = { tStar: number; K1: number; K2: number; lattice: SpinLattice };

// Even-odd replica exchange: tries pairs (0,1),(2,3),... then (1,2),(3,4),...
// Acceptance: P = min(1, exp(-(K1_a - K1_b)(Φ_b - Φ_a)))
// where Φ = betaEnergy / K1 is the temperature-independent reduced energy.
function attemptSwaps(replicas: Replica[]): void {
  for (let start = 0; start < 2; start++) {
    for (let i = start; i < replicas.length - 1; i += 2) {
      const a = replicas[i], b = replicas[i + 1];
      // Φ = -(ΣNN si*sj + j2*ΣNNN si*sj), same lattice-geometry for all replicas
      const phiA = a.lattice.betaEnergy(a.K1, a.K2, 0) / a.K1;
      const phiB = b.lattice.betaEnergy(b.K1, b.K2, 0) / b.K1;
      const deltaLogP = -(a.K1 - b.K1) * (phiB - phiA);
      if (deltaLogP >= 0 || Math.random() < Math.exp(deltaLogP)) {
        [replicas[i].lattice, replicas[i + 1].lattice] = [b.lattice, a.lattice];
      }
    }
  }
}

// Run Parallel Tempering for a fixed (jSign, j2OverJ1) over all T* values.
// Returns one entry per T*.
function runParallelTempering(
  N: number,
  jSign: 1 | -1,
  j2OverJ1: number,
  onProgress: (tStar: number, M: number, M_AFM: number, M_stripe: number) => void,
): PhaseDiagramEntry[] {
  const sorted = [...T_STAR_VALUES].sort((a, b) => a - b);

  const replicas: Replica[] = sorted.map(tStar => ({
    tStar,
    K1: jSign / tStar,
    K2: (jSign / tStar) * j2OverJ1,
    lattice: makeInitialLattice(N, jSign, j2OverJ1),
  }));

  // Thermalization
  for (let s = 0; s < SWEEPS_THERM; s++) {
    for (const r of replicas)
      r.lattice = sublatticeSweepLattice(r.lattice, r.K1, r.K2, 0);
    if ((s + 1) % SWAP_INTERVAL === 0) attemptSwaps(replicas);
  }

  // Measurement
  const sums = sorted.map(() => ({ M: 0, M_AFM: 0, M_stripe: 0, n: 0 }));
  const totalMeasSweeps = SWEEPS_MEAS * SWEEPS_MEAS_INTERVAL;
  for (let m = 0; m < totalMeasSweeps; m++) {
    for (const r of replicas)
      r.lattice = sublatticeSweepLattice(r.lattice, r.K1, r.K2, 0);
    if ((m + 1) % SWEEPS_MEAS_INTERVAL === 0) {
      for (let i = 0; i < replicas.length; i++) {
        const lat = replicas[i].lattice;
        sums[i].M       += Math.abs(lat.magnetization());
        sums[i].M_AFM   += Math.abs(lat.neelOrderParam());
        sums[i].M_stripe += lat.stripeOrderParam();
        sums[i].n++;
      }
    }
    if ((m + 1) % SWAP_INTERVAL === 0) attemptSwaps(replicas);
  }

  return sorted.map((tStar, i) => {
    const { M, M_AFM, M_stripe, n } = sums[i];
    const entry: PhaseDiagramEntry = {
      j2OverJ1, tStar, jSign,
      M:        M       / n,
      M_AFM:    M_AFM   / n,
      M_stripe: M_stripe / n,
    };
    onProgress(tStar, entry.M, entry.M_AFM, entry.M_stripe);
    return entry;
  });
}

async function main() {
  const { values: raw } = parseArgs({
    options: { N: { type: "string", default: "16" } },
    allowPositionals: false,
  });
  const N = Number(raw.N);

  const entries: PhaseDiagramEntry[] = [];
  const total = 2 * J2_OVER_J1_VALUES.length;
  let done = 0;

  for (const jSign of [1, -1] as const) {
    for (const j2OverJ1 of J2_OVER_J1_VALUES) {
      const results = runParallelTempering(N, jSign, j2OverJ1, (tStar, M, M_AFM, M_stripe) => {
        process.stdout.write(
          `\r[${done + 1}/${total}] jSign=${jSign} J2/J1=${j2OverJ1.toFixed(1)} T*=${tStar.toFixed(2)}`
          + `  M=${M.toFixed(3)} M_AFM=${M_AFM.toFixed(3)} M_stripe=${M_stripe.toFixed(3)}   `,
        );
      });
      entries.push(...results);
      done++;
    }
  }
  console.log("\nDone.");

  const data: PhaseDiagramData = {
    N,
    j2OverJ1Values: J2_OVER_J1_VALUES,
    tStarValues: T_STAR_VALUES,
    entries,
  };

  const outPath = path.resolve("src/data/phase-diagram.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
