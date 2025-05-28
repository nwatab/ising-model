"use client";
import React from "react";
import zlib from "zlib";
import Image from "next/image";
import { temperatures, CRITICAL_TEMP, beta_hs } from "@/config";
import { generateSVGDataURL, getTileSize } from "@/services/svg-lattice";

import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import { SimulationResultOnDisk } from "@/types";
import { rleDecode } from "@/services/rle";
import { SpinLattice } from "@/services/spin-lattice";
import { getBetaJ } from "@/services/physical_quantity";
import PhaseSection from "./phase-section";

export function IsingPage({
  simulationResults: results,
}: {
  simulationResults: (SimulationResultOnDisk & {
    energy: number;
    stdev_energy: number;
  })[];
}) {
  const N = results[0].lattice_size;
  const initialTemp = temperatures[Math.floor(temperatures.length / 2)];
  // const N = parseInt(process.env.NEXT_PUBLIC_N ?? "32");
  // const [betaJ, setBetaJ] = useState(0);
  const [temp, setTemp] = React.useState(initialTemp);
  const [jSign, setJSign] = React.useState<1 | -1>(1);
  const [betaH, setBetaH] = React.useState<(typeof beta_hs)[number]>(0);
  const [z, setZ] = React.useState(Math.floor(N / 2));
  const betaJ = jSign * getBetaJ(temp, CRITICAL_TEMP);
  const result = results.find((r) => r.beta_j === betaJ && r.beta_h === betaH);
  if (result === undefined) {
    throw new Error(
      `Simulation result not found for betaJ ${betaJ}, betaH ${betaH}`
    );
  }
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
      <div className="fixed top-4 left-4 bg-gray-800 p-2 sm:p-4 rounded-lg shadow-lg z-10 w-auto filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-85">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold">
            3D Ising Model
          </h1>
          <a
            href="https://github.com/nwatab/ising-model"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Image
              src="/github-mark-white.svg"
              alt="GitHub"
              width={20}
              height={20}
              className="w-5 h-5 md:w-6 md:h-6"
            />
          </a>
        </div>
        <ConfigSection
          temperature={temp}
          setTemperature={setTemp}
          betaH={betaH}
          setBetaH={setBetaH}
          z={z}
          setZ={setZ}
          jSign={jSign}
          setJSign={setJSign}
          latticeSize={N}
        />
        <PhaseSection betaJ={betaJ} />
        <StatisticalInfo
          energyPerSite={result.energy / (result.lattice_size ^ 3)}
          stdevEnergyPerSite={result.stdev_energy / (result.lattice_size ^ 3)}
          magnetization={result.magnetization}
          stdevMagnetization={result.stdev_magnetization}
        />
      </div>
    </div>
  );
}
