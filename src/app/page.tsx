import fs from "fs";

import { IsingPage } from "@/components/ising-page";
import { beta_hs, beta_js } from "@/config";
import { Suspense } from "react";
import { SimulationResultOnDisk } from "@/types";

export default function Home() {
  const simulationResults = beta_js.map((betaJ) =>
    beta_hs.map<SimulationResultOnDisk>((betah) => {
      const path = `data/betaj_${betaJ}_betah_${betah}.json`;
      return JSON.parse(fs.readFileSync(path, "utf8"));
    })
  );

  const troublesomeResult = simulationResults
    .flat()
    .flat()
    .find((v) => v.lattice_size !== simulationResults[0][0].lattice_size);
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
