import "tsconfig-paths/register.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";

import { temperatures, beta_hs, CRITICAL_TEMP, j2j1ratio } from "../config";
import { sweepEnergiesMetropolis } from "../services/metropolis";
import { rleEncode } from "../services/rle";
import type { SimulationResultOnDisk } from "@/types";
import { getBetaJ } from "@/services/physical_quantity";

async function main() {
  const { values: raw } = parseArgs({
    options: {
      N: {
        type: "string",
        default: process.env.NEXT_PUBLIC_N ?? "32",
      },
    },
    allowPositionals: false,
  });

  const N = Number(raw.N);
  for (let jSign = -1; jSign <= 1; jSign += 2) {
    const beta_js = temperatures
      .map((t) => jSign * getBetaJ(t, CRITICAL_TEMP))
      .sort((a, b) => Math.abs(a) - Math.abs(b));
    const simulationResults = sweepEnergiesMetropolis(
      beta_js,
      beta_hs,
      j2j1ratio,
      N
    ).flat(2);

    const outDir = path.resolve("data");
    fs.mkdirSync(outDir, { recursive: true });

    for (const result of simulationResults) {
      const { betaJ, betaH, j2j1ratio, lattice, betaEnergies, magnetizations, sweeps } =
        result;
      const compress = betaJ <= 0.2 ? "deflate" : "rle";
      const compressSync =
        compress === "deflate" ? zlib.deflateSync : rleEncode;

      const output: SimulationResultOnDisk = {
        lattice: Buffer.from(compressSync(lattice)).toString("base64"),
        beta_j: betaJ,
        beta_h: betaH,
        j2j1ratio,
        beta_energies: betaEnergies,
        magnetizations,
        sweeps,
        compress,
        lattice_size: N,
      };
      const fileName = `betaj_${betaJ.toFixed(6)}_betah_${betaH}_j2j1_${j2j1ratio.toFixed(2)}.json`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
      console.log(`✅ Saved simulation results to ${filePath}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
