/**
 * Pre-compute phase diagram data: sweep (J₂/J₁, T*) for both J₁ signs.
 * Outputs src/data/phase-diagram.json
 *
 * Usage:  pnpm run phase-diagram [--N=16]
 */
import "tsconfig-paths/register.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { simulateMetropolis } from "../services/metropolis";
import { SpinLattice } from "../services/spin-lattice";

const SWEEPS_THERM = 500;
const SWEEPS_MEAS = 8;
const SWEEPS_MEAS_INTERVAL = 10;

const J2_OVER_J1_VALUES = [-1.0, -0.8, -0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const T_STAR_VALUES = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.51, 5.0, 5.5, 6.0, 7.0, 8.0];

import type { PhaseDiagramData, PhaseDiagramEntry } from "@/types";

function measurePoint(
  N: number,
  jSign: 1 | -1,
  j2OverJ1: number,
  tStar: number,
): { M: number; M_AFM: number } {
  const K1 = jSign / tStar;
  const K2 = K1 * j2OverJ1;

  let lattice = simulateMetropolis(
    SpinLattice.createRandom(N),
    K1, K2, 0,
    SWEEPS_THERM,
  );

  let sumM = 0, sumMafm = 0;
  for (let i = 0; i < SWEEPS_MEAS; i++) {
    lattice = simulateMetropolis(lattice, K1, K2, 0, SWEEPS_MEAS_INTERVAL);
    sumM += Math.abs(lattice.magnetization());
    sumMafm += Math.abs(lattice.neelOrderParam());
  }

  return { M: sumM / SWEEPS_MEAS, M_AFM: sumMafm / SWEEPS_MEAS };
}

async function main() {
  const { values: raw } = parseArgs({
    options: { N: { type: "string", default: "16" } },
    allowPositionals: false,
  });
  const N = Number(raw.N);

  const entries: PhaseDiagramEntry[] = [];
  const total = 2 * J2_OVER_J1_VALUES.length * T_STAR_VALUES.length;
  let done = 0;

  for (const jSign of [1, -1] as const) {
    for (const j2OverJ1 of J2_OVER_J1_VALUES) {
      for (const tStar of T_STAR_VALUES) {
        const { M, M_AFM } = measurePoint(N, jSign, j2OverJ1, tStar);
        entries.push({ j2OverJ1, tStar, jSign, M, M_AFM });
        done++;
        process.stdout.write(
          `\r[${done}/${total}] jSign=${jSign} J2/J1=${j2OverJ1.toFixed(1)} T*=${tStar.toFixed(2)}  M=${M.toFixed(3)} M_AFM=${M_AFM.toFixed(3)}   `,
        );
      }
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
