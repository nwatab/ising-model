import "tsconfig-paths/register.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";

import { simulateMetropolis } from "../services/metropolis";
import { SpinLattice } from "../services/spin-lattice";
import { rleEncode } from "../services/rle";
import type { SimulationResultOnDisk } from "@/types";
import { CRITICAL_BETA_J, T_STAR_CRITICAL } from "@/constants";

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
    0,
    betaH,
    SWEEPS_THERMALIZATION
  );

  const betaEnergies: number[] = [lattice.betaEnergy(betaJ, 0, betaH)];
  const magnetizations: number[] = [lattice.magnetization()];
  let current = lattice;
  for (let i = 1; i < SWEEPS_MEASURE; i++) {
    current = simulateMetropolis(current, betaJ, 0, betaH, SWEEPS_MEASURE_INTERVAL);
    betaEnergies.push(current.betaEnergy(betaJ, 0, betaH));
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

  // Sample T* evenly around the critical point; K₁ = 1/T*
  const tStars = [1, 2, 3, 4, T_STAR_CRITICAL, 5, 6, 7, 8, 9];
  const betaJMags = tStars.map((t) => 1 / t);
  const beta_hs = [0, 0.5, 1.0, 1.5] as const; // h/T* values

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

        const compress =
          Math.abs(betaJ) <= CRITICAL_BETA_J ? "none"
          : betaJ > 0 ? "rle"
          : "deflate";
        const compressSync =
          compress === "deflate" ? zlib.deflateSync
          : compress === "rle" ? rleEncode
          : (x: Uint8Array) => x;

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
