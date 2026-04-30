"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useSimulation, SimStats } from "@/hooks/useSimulation";
import { T_STAR_CRITICAL } from "@/constants";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import StructureFactorPanel from "./structure-factor-panel";
import PhaseDiagramPanel from "./phase-diagram-panel";
import { SpinLattice } from "@/services/spin-lattice";
import { decodeLattice } from "@/services/decode-lattice";
import type { PhaseDiagramData } from "@/types";
import phaseDiagramRaw from "@/data/phase-diagram.json";

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

function inferPhase(M: number, mNeel: number, jSign: 1 | -1): string {
  if (Math.abs(M) > 0.15) return jSign > 0 ? "FM" : "AFM";
  if (Math.abs(mNeel) > 0.15) return "Néel";
  return "PM";
}

const PANEL_CLS =
  "bg-gray-800 rounded-lg shadow-lg z-10 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-90";

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
  const [tStar, setTStar] = useState<number>(T_STAR_CRITICAL);
  const [jSign, setJSign] = useState<1 | -1>(1);
  const [j2OverJ1, setJ2OverJ1] = useState(0);
  const [h, setH] = useState(0);
  const [z, setZ] = useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const K1 = jSign / tStar;
  const K2 = K1 * j2OverJ1;
  const hTilde = h / tStar;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialSpins = useMemo(
    () => Uint8Array.from(atob(initialSpinsBase64), (c) => c.charCodeAt(0)),
    [initialSpinsBase64]
  );

  const [warmSpins, setWarmSpins] = useState<Uint8Array>(initialSpins);
  const jSignRef = useRef(jSign);
  jSignRef.current = jSign;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (!isFinite(tStar)) return;
    const k1 = jSignRef.current / tStar;
    const ctrl = new AbortController();
    fetch(snapshotUrl(k1), { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => decodeLattice(d))
      .then((spins) => setWarmSpins(spins))
      .catch((e) => { if (e.name !== "AbortError") console.error(e); });
    return () => ctrl.abort();
  }, [tStar]);

  const initialLattice = useMemo(() => new SpinLattice(initialSpins), [initialSpins]);
  const phaseDiagramData = phaseDiagramRaw as unknown as PhaseDiagramData;

  const initialStats = useMemo<SimStats>(
    () => ({
      magnetization: initialLattice.magnetization(),
      energyPerSite:
        (initialLattice.betaEnergy(initialBetaJ, 0, initialBetaH) /
          initialLattice.spinCount) * T_STAR_CRITICAL,
      sweeps: 0,
      neelOrderParam: initialLattice.neelOrderParam(),
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

  const phase = inferPhase(stats.magnetization, stats.neelOrderParam, jSign);
  const tStarForDiagram = isFinite(tStar) ? tStar : 20;

  // Shared results content rendered in both mobile collapse and desktop right panel
  const resultsContent = (
    <>
      <StatisticalInfo
        energyPerSite={stats.energyPerSite}
        magnetization={stats.magnetization}
        neelOrderParam={stats.neelOrderParam}
        sweeps={stats.sweeps}
        phase={phase}
      />
      <StructureFactorPanel skPath={stats.skPath} latticeSize={latticeSize} />
      <PhaseDiagramPanel
        data={phaseDiagramData}
        jSign={jSign}
        tStar={tStarForDiagram}
        j2OverJ1={j2OverJ1}
      />
    </>
  );

  return (
    <div className="relative h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: "pixelated" }}
      />

      {/* ── Left / main control panel ── */}
      <div className={`fixed top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-64 p-3 md:p-4 ${PANEL_CLS}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base md:text-lg font-bold">3D Ising Model</h1>
          <div className="flex items-center gap-2">
            {/* Mobile: results toggle */}
            <button
              className="md:hidden text-lg leading-none px-1"
              onClick={() => setResultsOpen((o) => !o)}
              aria-label="Toggle results"
            >
              {resultsOpen ? "✕" : "📊"}
            </button>
            <a
              href="https://github.com/nwatab/ising-model"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image src="/github-mark-white.svg" alt="GitHub" width={20} height={20} />
            </a>
          </div>
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

        {/* Heat button */}
        <button
          onClick={() => setRunning((r) => !r)}
          className={`w-full py-1.5 rounded text-sm font-semibold transition-colors ${
            running
              ? "bg-gray-600 hover:bg-gray-500 text-white"
              : "bg-orange-600 hover:bg-orange-500 text-white"
          }`}
        >
          {running ? "⏸ Pause" : "🔥 Heat"}
        </button>

        {/* Mobile: inline key stats always visible */}
        <div className="md:hidden flex justify-between mt-2 text-xs text-gray-300">
          <span>M = {stats.magnetization.toFixed(3)}</span>
          <span className="text-orange-300">{phase}</span>
          <span>{stats.sweeps} sweeps</span>
        </div>

        {/* Mobile: collapsible results */}
        {resultsOpen && (
          <div className="md:hidden mt-3 border-t border-gray-700 pt-1 max-h-[60vh] overflow-y-auto">
            {resultsContent}
          </div>
        )}
      </div>

      {/* ── Right panel: desktop only ── */}
      <div className={`hidden md:block fixed top-4 right-4 w-72 p-4 ${PANEL_CLS} max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        {resultsContent}
      </div>
    </div>
  );
}
