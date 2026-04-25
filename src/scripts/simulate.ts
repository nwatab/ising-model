import "tsconfig-paths/register.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";

import { temperatures, beta_hs, CRITICAL_TEMP } from "../config";
import { simulateMetropolis } from "../services/metropolis";
import { SpinLattice } from "../services/spin-lattice";
import { rleEncode } from "../services/rle";
import type { SimulationResultOnDisk } from "@/types";
import { getBetaJ } from "@/services/physical_quantity";
import { CRITICAL_BETA_J } from "@/constants";

const SWEEPS_THERMALIZATION = 200;
const SWEEPS_MEASURE = 10;
const SWEEPS_MEASURE_INTERVAL = 5;

function thermalizeAndMeasure(
  N: number,
  betaJ: number,
  betaH: number
): { lattice: SpinLattice; betaEnergies: number[]; magnetizations: number[] } {
  const lattice = simulateMetropolis(
    SpinLattice.createRandom(N),
    betaJ,
    betaH,
    SWEEPS_THERMALIZATION
  );

  const betaEnergies: number[] = [lattice.betaEnergy(betaJ, betaH)];
  const magnetizations: number[] = [lattice.magnetization()];
  let current = lattice;
  for (let i = 1; i < SWEEPS_MEASURE; i++) {
    current = simulateMetropolis(current, betaJ, betaH, SWEEPS_MEASURE_INTERVAL);
    betaEnergies.push(current.betaEnergy(betaJ, betaH));
    magnetizations.push(current.magnetization());
  }

  return { lattice: current, betaEnergies, magnetizations };
}

async function main() {
  const { values: raw } = parseArgs({
    options: {
      N: { type: "string", default: process.env.NEXT_PUBLIC_N ?? "32" },
    },
    allowPositionals: false,
  });

  const N = Number(raw.N);
  const outDir = path.resolve("data");
  fs.mkdirSync(outDir, { recursive: true });

  const betaJMags = temperatures.map((t) => getBetaJ(t, CRITICAL_TEMP));

  for (const jSign of [-1, 1] as const) {
    for (const betaJMag of betaJMags) {
      for (const betaH of beta_hs) {
        const betaJ = jSign * betaJMag;

        console.time(`betaJ=${betaJ.toFixed(6)}, betaH=${betaH}`);
        const { lattice, betaEnergies, magnetizations } = thermalizeAndMeasure(
          N,
          betaJ,
          betaH
        );
        console.timeEnd(`betaJ=${betaJ.toFixed(6)}, betaH=${betaH}`);

        const compress = Math.abs(betaJ) < CRITICAL_BETA_J ? "deflate" : "rle";
        const compressSync =
          compress === "deflate" ? zlib.deflateSync : rleEncode;

        const output: SimulationResultOnDisk = {
          lattice: Buffer.from(compressSync(lattice)).toString("base64"),
          beta_j: betaJ,
          beta_h: betaH,
          beta_energies: betaEnergies,
          magnetizations,
          sweeps: SWEEPS_THERMALIZATION,
          compress,
          lattice_size: N,
        };

        const fileName = `betaj_${betaJ.toFixed(6)}_betah_${betaH}.json`;
        fs.writeFileSync(
          path.join(outDir, fileName),
          JSON.stringify(output, null, 2),
          "utf-8"
        );
        console.log(`✅ ${fileName}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
