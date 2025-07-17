import fs from "fs";

import { IsingPage } from "@/components/ising-page";
import { temperatures, beta_hs, CRITICAL_TEMP, j2j1ratio } from "@/config";
import { Suspense } from "react";
import { SimulationResultOnDisk } from "@/types";
import { getBetaJ } from "@/services/physical_quantity";

export default function Home() {
  const betaJs = ([-1, 1] as const).flatMap((jSign) =>
    temperatures.flatMap((t) => jSign * getBetaJ(t, CRITICAL_TEMP))
  );

  const simulationResults = betaJs.flatMap((betaJ) =>
    beta_hs.flatMap((betah) =>
      j2j1ratio.flatMap<SimulationResultOnDisk>((j2j1) => {
        const path = `data/betaj_${betaJ.toFixed(6)}_betah_${betah}_j2j1_${j2j1.toFixed(2)}.json`;
        return JSON.parse(fs.readFileSync(path, "utf8"));
      })
    )
  );

  const troublesomeResult = simulationResults.find(
    (v) => v.lattice_size !== simulationResults[0].lattice_size
  );
  if (troublesomeResult) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lattice: _lattice, ...data } = troublesomeResult;
    throw new Error(
      "Inconsistent lattice size: " + JSON.stringify(data, null, 2)
    );
  }

  return (
    <Suspense>
      <IsingPage simulationResults={simulationResults} />
    </Suspense>
  );
}
