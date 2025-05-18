import { IsingPage } from "@/components/ising-page";
import { beta_hs, beta_js } from "@/config";

import { sweepEnergiesMetropolis } from "@/services/metropolice";
import { Suspense } from "react";

export default function Home() {
  const N = parseInt(process.env.NEXT_PUBLIC_N ?? "32"); // Size of the lattice (N x N x N)
  const simulationResults = sweepEnergiesMetropolis(beta_js, beta_hs, N);

  return (
    <Suspense>
      <IsingPage simulationResults={simulationResults} />
    </Suspense>
  );
}
