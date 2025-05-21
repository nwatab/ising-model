"use client";
import zlib from "zlib";
import { beta_hs, beta_js } from "@/config";
import { generateSVGDataURL, getTileSize } from "@/services/svg-lattice";
import { useState } from "react";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import { SimulationResultOnDisk } from "@/types";
import { rleDecode } from "@/services/rle";
import { SpinLattice } from "@/services/spin-lattice";

export function IsingPage({
  simulationResults,
}: {
  simulationResults: SimulationResultOnDisk[][];
}) {
  const N = parseInt(process.env.NEXT_PUBLIC_N ?? "32");
  const [betaJ, setBetaJ] = useState(0);
  const [betaH, setBetaH] = useState(0);
  const [z, setZ] = useState(Math.floor(N / 2));
  const betaJIndex = beta_js.findIndex((v) => v === betaJ);
  const betaHIndex = beta_hs.findIndex((v) => v === betaH);
  if (betaJIndex === -1 || betaHIndex === -1) {
    throw new Error("Invalid betaJ or betaH: " + betaJ + ", " + betaH);
  }
  const result = simulationResults[betaJIndex][betaHIndex];
  const latticeCompressed = Buffer.from(result.lattice, "base64");
  const decompressSync =
    result.compress === "deflate" ? zlib.inflateSync : rleDecode;
  const lattice = new SpinLattice(decompressSync(latticeCompressed));
  const svgDataUrl = generateSVGDataURL(lattice, z);
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
          z={z}
          setBetaJ={(v) => setBetaJ(v)}
          setBetaH={(v) => setBetaH(v)}
          setZ={(v) => setZ(v)}
        />
        <StatisticalInfo
          energy={result.energy}
          magnetization={result.magnetization}
          stdevEnergy={result.stdev_energy}
          stdevMagnetization={result.stdev_magnetization}
        />
      </div>
    </div>
  );
}
