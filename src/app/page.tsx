import fs from "fs";
import zlib from "zlib";

import { IsingPage } from "@/components/ising-page";
import { temperatures, beta_hs, CRITICAL_TEMP } from "@/config";
import { Suspense } from "react";
import { SimulationResultOnDisk } from "@/types";
import { getBetaJ } from "@/services/physical_quantity";
import { rleDecode } from "@/services/rle";
import { CRITICAL_BETA_J } from "@/constants";

export default function Home() {
  const initialBetaJ = CRITICAL_BETA_J; // βJ at T* = 1 (critical point, jSign = +1)
  const initialBetaH = beta_hs[0]; // 0

  const path = `data/betaj_${initialBetaJ.toFixed(6)}_betah_${initialBetaH}.json`;
  const result: SimulationResultOnDisk = JSON.parse(fs.readFileSync(path, "utf-8"));

  const compressed = Buffer.from(result.lattice, "base64");
  const raw =
    result.compress === "deflate"
      ? zlib.inflateSync(compressed)
      : rleDecode(compressed);
  const initialSpinsBase64 = Buffer.from(raw).toString("base64");

  // Build betaJ grid for config slider bounds (sign = +1 only for positive side)
  const betaJMags = temperatures.map((t) => getBetaJ(t, CRITICAL_TEMP));

  return (
    <Suspense>
      <IsingPage
        initialSpinsBase64={initialSpinsBase64}
        latticeSize={result.lattice_size}
        initialBetaJ={initialBetaJ}
        initialBetaH={initialBetaH}
        betaJMags={betaJMags}
      />
    </Suspense>
  );
}
