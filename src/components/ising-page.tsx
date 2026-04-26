"use client";
import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { useSimulation, SimStats } from "@/hooks/useSimulation";
import { T_STAR_CRITICAL } from "@/constants";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import PhaseSection from "./phase-section";
import { SpinLattice } from "@/services/spin-lattice";

export function IsingPage({
  initialSpinsBase64,
  latticeSize,
  initialBetaJ,
  initialBetaH,
}: {
  initialSpinsBase64: string;
  latticeSize: number;
  initialBetaJ: number;
  initialBetaH: number;
}) {
  // UI layer: T*, J₁_sign, h
  const [tStar, setTStar] = useState(
    parseFloat(T_STAR_CRITICAL.toFixed(2)) // round to slider step
  );
  const [jSign, setJSign] = useState<1 | -1>(1);
  const [h, setH] = useState(0);
  const [z, setZ] = useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);

  // Adapter layer: UI → computation (K₁, h̃)
  const K1 = jSign / tStar;
  const hTilde = h / tStar;

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
    betaJ: K1,
    betaH: hTilde,
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
          tStar={tStar}
          setTStar={setTStar}
          jSign={jSign}
          setJSign={setJSign}
          h={h}
          setH={setH}
          z={z}
          setZ={setZ}
          latticeSize={latticeSize}
        />
        <PhaseSection tStar={tStar} jSign={jSign} />
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
