"use client";
import { beta_hs, beta_js } from "@/config";
import { getIndex } from "@/services/ising";
import { generateSVGDataURL, getTileSize } from "@/services/svg-lattice";
import { SpinArray } from "@/types";
import { useState } from "react";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";

export function IsingPage({
  simulationResults,
}: {
  simulationResults: {
    lattice: SpinArray;
    betaJ: number;
    betaH: number;
    energy: number;
    magnetization: number;
  }[][];
}) {
  const N = parseInt(process.env.NEXT_PUBLIC_N ?? "32");
  const [betaJ, setBetaJ] = useState(0);
  const [betaH, setBetaH] = useState(0);
  // pick lattice based on betaJ and betaH. find inex of betaJ and betaH and get the lattice

  const betaJIndex = beta_js.findIndex((v) => v === betaJ);
  const betaHIndex = beta_hs.findIndex((v) => v === betaH);
  if (betaJIndex === -1 || betaHIndex === -1) {
    throw new Error("Invalid betaJ or betaH: " + betaJ + ", " + betaH);
  }
  const result = simulationResults[betaJIndex][betaHIndex];
  const lattice = result.lattice;
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
      <div className="fixed top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 w-64 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-85">
        <h1 className="text-xl font-bold mb-4">3D Ising Model</h1>
        <ConfigSection
          betaJ={betaJ}
          betaH={betaH}
          setBetaJ={(v) => setBetaJ(v)}
          setBetaH={(v) => setBetaH(v)}
        />
        <StatisticalInfo
          energy={result.energy}
          magnetization={result.magnetization}
        />
      </div>
    </div>
  );
}
