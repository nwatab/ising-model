import fs from "fs";

import { IsingPage } from "@/components/ising-page";
import { temperatures, beta_hs, CRITICAL_TEMP } from "@/config";
import { Suspense } from "react";
import { SimulationResultOnDisk } from "@/types";
import { getBetaJ, getkT } from "@/services/physical_quantity";

export default function Home() {
  const betaJs = ([-1, 1] as const).flatMap((jSign) =>
    temperatures.flatMap((t) => jSign * getBetaJ(t, CRITICAL_TEMP))
  );

  const simulationResults = betaJs.flatMap((betaJ) =>
    beta_hs
      .flatMap<SimulationResultOnDisk>((betah) => {
        const path = `data/betaj_${betaJ.toFixed(6)}_betah_${betah}.json`;
        return JSON.parse(fs.readFileSync(path, "utf8"));
      })
      .map((result) => ({
        ...result,
        energy: getkT(result.beta_j) * result.beta_energy,
        stdev_energy: getkT(result.beta_j) * result.stdev_beta_energy,
      }))
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
