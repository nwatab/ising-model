import { Lattice } from "@/components/lattice";
import ParamConfig from "@/components/param-config";
import {
  calculateMagnetization,
  calculateSpinEnergy,
  calculateTotalEnergy,
  getIndex,
  initializeRandomLattice,
  simulateMsimulateMetropolistlopolis,
} from "@/services/ising";
import { Suspense } from "react";

export function generateStaticParams() {
  const values = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3] as const;
  const params = values.flatMap((beta_j) =>
    values.flatMap((beta_h) => ({
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
  const lattice = simulateMsimulateMetropolistlopolis(
    initialLattice,
    betaJ,
    betaH,
    N,
    calculateSpinEnergy
  );
  const energy = calculateTotalEnergy(lattice, betaJ, betaH, N);
  const magnetization = calculateMagnetization(lattice);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 text-white p-4">
      {/* Info panel */}
      <div className="fixed top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 w-64 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
        <h1 className="text-xl font-bold mb-4">3D Ising Model</h1>
        <Suspense>
          <ParamConfig betaJ={betaJ} betaH={betaH} />
        </Suspense>

        <div className="space-y-4">
          <div className="text-sm">
            <div>
              Lattice size: {N} &times; {N} &times; {N}
            </div>
            <div>Sliced at: z = {Math.floor(N / 2)}</div>
            <div>Energy (βE): {energy.toFixed(2)}</div>
            <div>Magnetization: {magnetization.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* Static lattice display */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-0 border border-gray-700 rounded"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${N}, minmax(0, 1fr))`,
            width: "min(90vw, 90vh)",
            height: "min(90vw, 90vh)",
          }}
        >
          <Lattice lattice={lattice} N={N} getIndex={getIndex} />
        </div>
      </div>
    </div>
  );
}
