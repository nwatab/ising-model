import { Lattice } from "@/components/lattice";
import ConfigPanel from "@/components/config-panel";
import {
  calculateMagnetization,
  calculateTotalEnergy,
  getIndex,
  initializeRandomLattice,
} from "@/services/ising";
import { determineWolffSteps, wolffStep } from "@/services/wolff";
import { SpinArray } from "@/types";
import { Suspense } from "react";

export function generateStaticParams() {
  const brta_js = [
    -0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5,
  ] as const;
  const beta_hs = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3] as const;
  const params = brta_js.flatMap((beta_j) =>
    beta_hs.flatMap((beta_h) => ({
      beta_j: beta_j.toFixed(1),
      beta_h: beta_h.toFixed(1),
    }))
  );
  return params;
}

export default async function Home({
  params,
}: {
  params: Promise<{ beta_j: string; beta_h: string }>;
}) {
  const { beta_j, beta_h } = await params;
  const betaJ = parseFloat(beta_j) || 0;
  const betaH = parseFloat(beta_h) || 0;
  const N = 32; // Size of the lattice (N x N x N)

  const initialLattice = initializeRandomLattice(N);
  const steps = determineWolffSteps(betaJ, betaH, N);
  const lattice = Array.from({ length: steps }).reduce<SpinArray>(
    (acc) => {
      wolffStep(acc, betaJ, betaH, N, getIndex);
      return acc;
    },
    new Int8Array(initialLattice) as SpinArray
  );
  const energy = calculateTotalEnergy(lattice, betaJ, betaH, N);
  const magnetization = calculateMagnetization(lattice);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 text-white">
      {/* Info panel */}
      <div className="fixed top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 w-64 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-85">
        <h1 className="text-xl font-bold mb-4">3D Ising Model</h1>
        <Suspense>
          <ConfigPanel betaJ={betaJ} betaH={betaH} />
        </Suspense>

        <div className="text-sm mt-4 space-y-2">
          <div>
            Lattice size: {N} &times; {N} &times; {N}
          </div>
          <div>Sliced at: z = {Math.floor(N / 2)}</div>
          <div>
            Energy (βE):{" "}
            {energy.toLocaleString("ja-JP", {
              maximumFractionDigits: 3,
            })}
          </div>
          <div>Magnetization: {magnetization.toFixed(3)}</div>
        </div>
      </div>

      {/* Static lattice display */}
      <div className="flex-1 flex items-center justify-center w-full h-full">
        <div
          className="grid gap-0 border border-gray-700 rounded w-full max-w-full max-h-full aspect-square"
          style={{
            gridTemplateColumns: `repeat(${N}, 1fr)`,
            gridTemplateRows: `repeat(${N}, 1fr)`,
          }}
        >
          <Lattice lattice={lattice} N={N} getIndex={getIndex} />
        </div>
      </div>
    </div>
  );
}
