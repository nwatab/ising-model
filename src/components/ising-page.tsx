"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useSimulation, SimStats } from "@/hooks/useSimulation";
import { T_STAR_CRITICAL } from "@/constants";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import PhaseSection from "./phase-section";
import StructureFactorPanel from "./structure-factor-panel";
import PhaseDiagramPanel from "./phase-diagram-panel";
import { SpinLattice } from "@/services/spin-lattice";
import { decodeLattice } from "@/services/decode-lattice";
import type { PhaseDiagramData } from "@/types";
import phaseDiagramRaw from "@/data/phase-diagram.json";

// Positive betaJ values available as pre-computed snapshots.
// Negatives (AFM) are derived by sign(K1).
const SNAPSHOT_BETAJS = [
  0.184712, 0.192743, 0.201504, 0.211099, 0.221654,
  0.233320, 0.246282, 0.260769, 0.277067,
];

function nearestBetaJ(k1: number): number {
  const pool = k1 < 0 ? SNAPSHOT_BETAJS.map((b) => -b) : SNAPSHOT_BETAJS;
  return pool.reduce((best, c) =>
    Math.abs(c - k1) < Math.abs(best - k1) ? c : best
  );
}

function snapshotUrl(k1: number): string {
  const betaJ = nearestBetaJ(k1);
  return `/snapshots/betaj_${betaJ.toFixed(6)}_betah_0.json`;
}

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
  // UI layer: T*, J₁_sign, J₂/J₁, h
  const [tStar, setTStar] = useState<number>(T_STAR_CRITICAL);
  const [jSign, setJSign] = useState<1 | -1>(1);
  const [j2OverJ1, setJ2OverJ1] = useState(0);
  const [h, setH] = useState(0);
  const [z, setZ] = useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);

  // Adapter layer: UI → computation (K₁, K₂, h̃)
  const K1 = jSign / tStar;
  const K2 = K1 * j2OverJ1;
  const hTilde = h / tStar;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialSpins = useMemo(
    () => Uint8Array.from(atob(initialSpinsBase64), (c) => c.charCodeAt(0)),
    [initialSpinsBase64]
  );

  // Warm-start spins: reset to nearest pre-computed snapshot when T* changes.
  // J₁_sign and h changes do not trigger a reset (continuity not required there).
  const [warmSpins, setWarmSpins] = useState<Uint8Array>(initialSpins);
  const jSignRef = useRef(jSign);
  jSignRef.current = jSign;
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip on initial mount — the SSG snapshot is already the correct warm start.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!isFinite(tStar)) return; // T*=∞: K₁=0, any state thermalises instantly

    const k1 = jSignRef.current / tStar;
    const ctrl = new AbortController();

    fetch(snapshotUrl(k1), { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => decodeLattice(d))
      .then((spins) => setWarmSpins(spins))
      .catch((e) => {
        if (e.name !== "AbortError") console.error("snapshot fetch failed", e);
      });

    return () => ctrl.abort();
  }, [tStar]);

  const initialLattice = useMemo(
    () => new SpinLattice(initialSpins),
    [initialSpins]
  );

  const phaseDiagramData = phaseDiagramRaw as unknown as PhaseDiagramData;

  const initialStats = useMemo<SimStats>(
    () => ({
      magnetization: initialLattice.magnetization(),
      energyPerSite:
        (initialLattice.betaEnergy(initialBetaJ, 0, initialBetaH) /
        initialLattice.spinCount) * T_STAR_CRITICAL,
      sweeps: 0,
      skPath: null,
    }),
    [initialLattice, initialBetaJ, initialBetaH]
  );

  const [stats, setStats] = useState<SimStats>(initialStats);

  useSimulation({
    canvasRef,
    initialSpins: warmSpins,
    betaJ: K1,
    betaJ2: K2,
    betaH: hTilde,
    tStar,
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
          j2OverJ1={j2OverJ1}
          setJ2OverJ1={setJ2OverJ1}
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
          energyPerSite={stats.energyPerSite}
          magnetization={stats.magnetization}
          sweeps={stats.sweeps}
        />
        <StructureFactorPanel
          skPath={stats.skPath}
          latticeSize={latticeSize}
        />
        <PhaseDiagramPanel
          data={phaseDiagramData}
          jSign={jSign}
          tStar={isFinite(tStar) ? tStar : 20}
          j2OverJ1={j2OverJ1}
        />
      </div>
    </div>
  );
}
