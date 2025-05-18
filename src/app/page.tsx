// import { Lattice } from "@/components/lattice";
import ConfigPanel from "@/components/config-panel";
import {
  calculateMagnetization,
  calculateTotalEnergy,
  getIndex,
  initializeRandomLattice,
} from "@/services/ising";

import { Suspense } from "react";
import { estimateSweeps, simulateMetropolis } from "@/services/metropolice";
import { generateSVGDataURL, getTileSize } from "@/services/svg-lattice";

export default async function Home() {
  const betaJ = 0;
  const betaH = 1e-9;
  const N = 32; // Size of the lattice (N x N x N)

  const initialLattice = initializeRandomLattice(N);
  const sweeps = estimateSweeps(betaJ);
  const lattice = simulateMetropolis(initialLattice, betaJ, betaH, N, sweeps);
  const energy = calculateTotalEnergy(lattice, betaJ, betaH, N);
  const magnetization = calculateMagnetization(lattice);
  const svgDataUrl = generateSVGDataURL(lattice, N, getIndex);
  const tileSize = getTileSize(16, N);
  return (
    <div
      className="relative h-screen w-screen bg-gray-900 text-white"
      style={{
        backgroundImage: `url("${svgDataUrl}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${tileSize}px ${tileSize}px`,
      }}
    >
      {/* Info panel */}
      <div className="fixed top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 w-64 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-85">
        <h1 className="text-xl font-bold mb-4">3D Ising Model</h1>
        <Suspense>
          <ConfigPanel betaJ={betaJ} betaH={betaH} />
        </Suspense>

        <div className="text-sm mt-4 space-y-2">
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
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-0 border border-gray-700 rounded w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${N}, minmax(0, 1fr))`,
          }}
        />
      </div>
    </div>
  );
}
