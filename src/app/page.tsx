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

  return (
    <Suspense>
      <IsingPage simulationResults={simulationResults} />
    </Suspense>
  );
}
