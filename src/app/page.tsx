import fs from "fs";
import zlib from "zlib";

import { IsingPage } from "@/components/ising-page";
import { Suspense } from "react";
import { SimulationResultOnDisk } from "@/types";
import { rleDecode } from "@/services/rle";
import { CRITICAL_BETA_J } from "@/constants";

export default function Home() {
  const initialBetaJ = CRITICAL_BETA_J; // T* = T*_c at startup
  const initialBetaH = 0;

  const path = `data/betaj_${initialBetaJ.toFixed(6)}_betah_${initialBetaH}.json`;
  const result: SimulationResultOnDisk = JSON.parse(fs.readFileSync(path, "utf-8"));

  const compressed = Buffer.from(result.lattice, "base64");
  const raw =
    result.compress === "deflate" ? zlib.inflateSync(compressed)
    : result.compress === "rle" ? rleDecode(compressed)
    : compressed;
  const initialSpinsBase64 = Buffer.from(raw).toString("base64");

  return (
    <Suspense>
      <IsingPage
        initialSpinsBase64={initialSpinsBase64}
        latticeSize={result.lattice_size}
        initialBetaJ={initialBetaJ}
        initialBetaH={initialBetaH}
      />
    </Suspense>
  );
}
