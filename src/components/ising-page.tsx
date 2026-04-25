"use client";
import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { beta_hs } from "@/config";
import { useSimulation, SimStats } from "@/hooks/useSimulation";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import PhaseSection from "./phase-section";
import { SpinLattice } from "@/services/spin-lattice";

export function IsingPage({
  initialSpinsBase64,
  latticeSize,
  initialBetaJ,
  initialBetaH,
  betaJMags,
}: {
  initialSpinsBase64: string;
  latticeSize: number;
  initialBetaJ: number;
  initialBetaH: number;
  betaJMags: readonly number[];
}) {
  const initialBetaJMag = Math.abs(initialBetaJ);
  const [betaJMag, setBetaJMag] = React.useState(initialBetaJMag);
  const [jSign, setJSign] = React.useState<1 | -1>(initialBetaJ >= 0 ? 1 : -1);
  const [betaH, setBetaH] = React.useState<(typeof beta_hs)[number]>(
    initialBetaH as (typeof beta_hs)[number]
  );
  const [z, setZ] = React.useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);

  const betaJ = jSign * betaJMag;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialSpins = useMemo(
    () => Uint8Array.from(atob(initialSpinsBase64), (c) => c.charCodeAt(0)),
    [initialSpinsBase64]
  );

  const initialLattice = useMemo(
    () => new SpinLattice(initialSpins),
    [initialSpins]
  );

  const initialStats = useMemo<SimStats>(
    () => ({
      magnetization: initialLattice.magnetization(),
      betaEnergyPerSite:
        initialLattice.betaEnergy(initialBetaJ, initialBetaH) /
        initialLattice.spinCount,
      sweeps: 0,
    }),
    [initialLattice, initialBetaJ, initialBetaH]
  );

  const [stats, setStats] = useState<SimStats>(initialStats);

  useSimulation({
    canvasRef,
    initialSpins,
    betaJ,
    betaH,
    z,
    running,
    onStats: setStats,
  });

  return (
    <div className="relative h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: "pixelated" }}
      />
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
          betaJMag={betaJMag}
          setBetaJMag={setBetaJMag}
          betaH={betaH}
          setBetaH={setBetaH}
          z={z}
          setZ={setZ}
          jSign={jSign}
          setJSign={setJSign}
          latticeSize={latticeSize}
          betaJMags={betaJMags}
        />
        <PhaseSection betaJ={betaJ} />
        <button
          onClick={() => setRunning((r) => !r)}
          className={`mt-3 w-full py-1.5 rounded text-sm font-semibold transition-colors ${
            running
              ? "bg-gray-600 hover:bg-gray-500 text-white"
              : "bg-orange-600 hover:bg-orange-500 text-white"
          }`}
        >
          {running ? "⏸ Pause" : "🔥 Heat"}
        </button>
        <StatisticalInfo
          betaEnergyPerSite={stats.betaEnergyPerSite}
          magnetization={stats.magnetization}
          sweeps={stats.sweeps}
        />
      </div>
    </div>
  );
}
