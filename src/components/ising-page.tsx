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
import type { SliceAxis } from "@/services/canvas-lattice";
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

function inferPhase(M: number, mNeel: number, mStripe: number, jSign: 1 | -1): string {
  if (Math.abs(M) > 0.15) return jSign > 0 ? "Ferromagnetic" : "Antiferromagnetic";
  if (Math.abs(mNeel) > 0.15) return "Néel Antiferromagnetic";
  if (mStripe > 0.15) return "Striped Antiferromagnetic";
  return "Paramagnetic";
}

const PANEL_CLS =
  "bg-gray-800 rounded-lg shadow-lg z-10 filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.25)] opacity-90";

function AccordionSection({
  title,
  tip,
  open,
  onToggle,
  children,
}: {
  title: React.ReactNode;
  tip?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-700 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 py-1.5 text-sm font-bold text-left text-gray-100 hover:text-white"
      >
        <span className="text-xs leading-none">{open ? "▾" : "▸"}</span>
        {tip ? (
          <span className="relative group cursor-help">
            {title}
            <span className="ml-0.5 text-blue-400 text-xs align-middle">ⓘ</span>
            <span className="pointer-events-none absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 border border-gray-600 text-gray-200 text-xs px-2 py-1 rounded whitespace-nowrap z-50 font-normal">
              {tip}
            </span>
          </span>
        ) : title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
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
  const [tStar, setTStar] = useState<number>(T_STAR_CRITICAL);
  const [jSign, setJSign] = useState<1 | -1>(1);
  const [j2OverJ1, setJ2OverJ1] = useState(0);
  const [h, setH] = useState(0);
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);

  const [paramsOpen, setParamsOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [skOpen, setSkOpen] = useState(true);
  const [phaseOpen, setPhaseOpen] = useState(true);

  const K1 = jSign / tStar;
  const K2 = K1 * j2OverJ1;
  const hTilde = h / tStar;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialSpins = useMemo(
    () => Uint8Array.from(atob(initialSpinsBase64), (c) => c.charCodeAt(0)),
    [initialSpinsBase64]
  );

  const [warmSpins, setWarmSpins] = useState<Uint8Array>(initialSpins);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    // J₁ < 0: no AFM snapshots exist; seed from the correct ordered ground state.
    // J₂/J₁ > 0.25 → diagonal stripe (0,π,π); otherwise Néel (π,π,π).
    if (jSign < 0) {
      const seed = j2OverJ1 > 0.25
        ? SpinLattice.createDiagonalLayered(latticeSize)
        : SpinLattice.createNeel(latticeSize);
      setWarmSpins(new Uint8Array(seed));
      return;
    }
    if (!isFinite(tStar)) return;
    const k1 = jSign / tStar;
    const ctrl = new AbortController();
    fetch(snapshotUrl(k1), { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => decodeLattice(d))
      .then((spins) => setWarmSpins(spins))
      .catch((e) => { if (e.name !== "AbortError") console.error(e); });
    return () => ctrl.abort();
  }, [tStar, jSign, j2OverJ1, latticeSize]);

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
      stripeOrderParam: 0,
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
    sliceAxis,
    sliceIndex,
    running,
    onStats: setStats,
  });

  const phase = inferPhase(stats.magnetization, stats.neelOrderParam, stats.stripeOrderParam, jSign);
  const tStarForDiagram = isFinite(tStar) ? tStar : 20;

  const controlsContent = (
    <div>
      <AccordionSection
        title="Parameters"
        open={paramsOpen}
        onToggle={() => setParamsOpen((o) => !o)}
      >
        <ConfigSection
          tStar={tStar}
          setTStar={setTStar}
          jSign={jSign}
          setJSign={setJSign}
          j2OverJ1={j2OverJ1}
          setJ2OverJ1={setJ2OverJ1}
          h={h}
          setH={setH}
          sliceAxis={sliceAxis}
          setSliceAxis={setSliceAxis}
          sliceIndex={sliceIndex}
          setSliceIndex={setSliceIndex}
          latticeSize={latticeSize}
        />
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
      </AccordionSection>
      <AccordionSection
        title={`Phase Diagram (J₁ ${jSign > 0 ? ">" : "<"} 0, h=0)`}
        open={phaseOpen}
        onToggle={() => setPhaseOpen((o) => !o)}
      >
        <div className={`transition-opacity duration-200 ${h !== 0 ? "opacity-40" : ""}`}>
          <PhaseDiagramPanel
            data={phaseDiagramData}
            jSign={jSign}
            tStar={tStarForDiagram}
            j2OverJ1={j2OverJ1}
          />
        </div>
      </AccordionSection>
    </div>
  );

  const resultsContent = (
    <div>
      <AccordionSection
        title="Statistics"
        open={statsOpen}
        onToggle={() => setStatsOpen((o) => !o)}
      >
        <StatisticalInfo
          energyPerSite={stats.energyPerSite}
          magnetization={stats.magnetization}
          neelOrderParam={stats.neelOrderParam}
          stripeOrderParam={stats.stripeOrderParam}
          sweeps={stats.sweeps}
          phase={phase}
        />
      </AccordionSection>
      <AccordionSection
        title="S(k)"
        tip={<>S(k) = (1/N<sup>3</sup>)|Σ s<sub>i</sub> e<sup>ik·r<sub>i</sub></sup>|<sup>2</sup></>}
        open={skOpen}
        onToggle={() => setSkOpen((o) => !o)}
      >
        <StructureFactorPanel skPath={stats.skPath} latticeSize={latticeSize} />
      </AccordionSection>
    </div>
  );

  return (
    <div className="relative h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: "pixelated" }}
      />

      {/* ── Mobile: two stacked panels on left ── */}
      <div className="md:hidden fixed top-2 left-2 z-10 flex flex-col gap-2 w-64 max-h-[calc(100vh-1rem)] overflow-y-auto">
        <div className={`${PANEL_CLS} p-3`}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-base font-bold">3D Ising Model</h1>
            <a
              href="https://github.com/nwatab/ising-model"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image src="/github-mark-white.svg" alt="GitHub" width={20} height={20} />
            </a>
          </div>
          {controlsContent}
        </div>
        <div className={`${PANEL_CLS} p-3`}>
          {resultsContent}
        </div>
      </div>

      {/* ── Desktop: left controls panel ── */}
      <div className={`hidden md:block fixed top-4 left-4 w-64 p-4 ${PANEL_CLS} max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-base md:text-lg font-bold">3D Ising Model</h1>
          <a
            href="https://github.com/nwatab/ising-model"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/github-mark-white.svg" alt="GitHub" width={20} height={20} />
          </a>
        </div>
        {controlsContent}
      </div>

      {/* ── Desktop: right results panel ── */}
      <div className={`hidden md:block fixed top-4 right-4 w-72 p-4 ${PANEL_CLS} max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        {resultsContent}
      </div>
    </div>
  );
}
