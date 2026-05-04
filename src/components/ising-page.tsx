"use client";
import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { useSimulation, SimStats, skPathSegments } from "@/hooks/useSimulation";
import { T_STAR_CRITICAL } from "@/constants";
import ConfigSection from "./config-section";
import StatisticalInfo from "./statistical-info";
import StructureFactorPanel from "./structure-factor-panel";
import CorrelationPanel from "./correlation-panel";
import HistogramPanel from "./energy-histogram-panel";
import PhaseDiagramPanel from "./phase-diagram-panel";
import { SpinLattice } from "@/services/spin-lattice";
import type { SliceAxis } from "@/services/canvas-lattice";
import type { PhaseDiagramData } from "@/types";
import phaseDiagramRaw from "@/data/phase-diagram.json";

function inferPhase(
  M: number, mNeel: number, mStripe: number, jSign: 1 | -1,
  skPath: Float32Array | null, latticeSize: number,
): string {
  if (Math.abs(M) > 0.15) return jSign > 0 ? "Ferromagnetic" : "Antiferromagnetic";
  if (Math.abs(mNeel) > 0.15) return "Néel Antiferromagnetic";
  if (mStripe > 0.15) return "Striped Antiferromagnetic";

  // S(k) peak-position fallback: catches multi-domain ordered phases where
  // global order parameters cancel but the Bragg peak is clearly visible.
  // Requires S(k_peak) > N³·(0.03)² so random noise at T*=∞ (where S(k)≈1
  // per mode) never triggers. WASM returns S(k)=|Σ sᵢe^{ik·r}|²/N³, so the
  // threshold equals the signal from an effective order parameter of ~3%.
  if (skPath && skPath.length > 0) {
    const segs = skPathSegments(latticeSize);
    const idxX = segs.find(s => s.label === "X")?.idx ?? -1;
    const idxR = segs.find(s => s.label === "R")?.idx ?? -1;
    let peakIdx = 0;
    for (let i = 1; i < skPath.length; i++) {
      if (skPath[i] > skPath[peakIdx]) peakIdx = i;
    }
    const N3 = latticeSize ** 3;
    const minOrderedPeak = N3 * 0.0009; // = N³ · (0.03)²
    if (skPath[peakIdx] < minOrderedPeak) return "Paramagnetic";
    const half = Math.max(2, Math.floor(Math.floor(latticeSize / 2) / 4));
    if (idxR >= 0 && Math.abs(peakIdx - idxR) <= half) return "Néel Antiferromagnetic";
    if (idxX >= 0 && Math.abs(peakIdx - idxX) <= half) return "Striped Antiferromagnetic";
  }

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
        className="relative w-full flex items-center gap-1.5 py-1.5 text-sm font-bold text-left text-gray-100 hover:text-white group"
      >
        <span className="text-xs leading-none">{open ? "▾" : "▸"}</span>
        {tip ? (
          <>
            <span className="cursor-help">
              {title}
              <span className="ml-0.5 text-blue-400 text-xs align-middle">ⓘ</span>
            </span>
            <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-900 border border-gray-600 text-gray-200 text-xs px-2 py-1.5 rounded w-64 z-50 font-normal leading-relaxed">
              {tip}
            </span>
          </>
        ) : title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function IsingPage({
  latticeSize,
}: {
  latticeSize: number;
}) {
  const [tStar, setTStar] = useState<number>(T_STAR_CRITICAL);
  const [jSign, setJSign] = useState<1 | -1>(1);
  const [j2OverJ1, setJ2OverJ1] = useState(0);
  const [h, setH] = useState(0);
  const [sliceAxis, setSliceAxis] = useState<SliceAxis>("z");
  const [sliceIndex, setSliceIndex] = useState(Math.floor(latticeSize / 2));
  const [running, setRunning] = useState(false);

  const [paramsOpen, setParamsOpen] = useState(true);
  const [displayOpen, setDisplayOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [skOpen, setSkOpen] = useState(true);
  const [crOpen, setCrOpen] = useState(true);
  const [eHistOpen, setEHistOpen] = useState(true);
  const [mHistOpen, setMHistOpen] = useState(true);
  const [phaseOpen, setPhaseOpen] = useState(true);

  const K1 = jSign / tStar;
  const K2 = K1 * j2OverJ1;
  const hTilde = h / tStar;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [warmSpins, setWarmSpins] = useState<Uint8Array>(() =>
    new Uint8Array(SpinLattice.createRandom(latticeSize))
  );
  const handleReset = () =>
    setWarmSpins(new Uint8Array(SpinLattice.createRandom(latticeSize)));

  const handleSetJSign = (v: 1 | -1) => {
    setJSign(v);
    setWarmSpins(new Uint8Array(SpinLattice.createRandom(latticeSize)));
  };

  const phaseDiagramData = phaseDiagramRaw as unknown as PhaseDiagramData;

  const [stats, setStats] = useState<SimStats>({
    magnetization: 0,
    energyPerSite: 0,
    sweeps: 0,
    neelOrderParam: 0,
    stripeOrderParam: 0,
    skPath: null,
    energySamples: null,
    magnetizationSamples: null,
    histSamplesFilled: 0,
    energyStdDev: null,
    magnetizationStdDev: null,
    heatCapacity: null,
    susceptibility: null,
    correlationLength: null,
    correlationData: null,
  });

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

  const phase = inferPhase(stats.magnetization, stats.neelOrderParam, stats.stripeOrderParam, jSign, stats.skPath, latticeSize);
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
          setJSign={handleSetJSign}
          j2OverJ1={j2OverJ1}
          setJ2OverJ1={setJ2OverJ1}
          h={h}
          setH={setH}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`flex-1 py-1.5 rounded text-sm font-semibold transition-colors ${
              running
                ? "bg-gray-600 hover:bg-gray-500 text-white"
                : "bg-orange-600 hover:bg-orange-500 text-white"
            }`}
          >
            {running ? "⏸ Pause" : "🔥 Heat"}
          </button>
          <button
            onClick={handleReset}
            className="py-1.5 px-3 rounded text-sm font-semibold transition-colors bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            ↺
          </button>
        </div>
      </AccordionSection>
      <AccordionSection
        title="Display"
        open={displayOpen}
        onToggle={() => setDisplayOpen((o) => !o)}
      >
        <div className="mb-4 ml-2">
          <div className="flex gap-2 mb-2">
            {(["x", "y", "z"] as SliceAxis[]).map((ax) => (
              <label key={ax} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="sliceAxis"
                  checked={sliceAxis === ax}
                  onChange={() => setSliceAxis(ax)}
                  className="mr-0.5"
                />
                {ax}-axis
              </label>
            ))}
          </div>
          <label className="block text-sm font-medium mb-1">
            {sliceAxis} = <span className="font-mono">{sliceIndex}</span>
          </label>
          <input
            type="range"
            min={0}
            max={latticeSize - 1}
            step={1}
            value={sliceIndex}
            onChange={(e) => setSliceIndex(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
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
          energyStdDev={stats.energyStdDev}
          magnetizationStdDev={stats.magnetizationStdDev}
          heatCapacity={stats.heatCapacity}
          susceptibility={stats.susceptibility}
          correlationLength={stats.correlationLength}
          latticeSize={latticeSize}
        />
      </AccordionSection>
      <AccordionSection
        title="S(k)"
        tip={<>S(k) = (1/N)|Σ s<sub>i</sub> e<sup>ik·r<sub>i</sub></sup>|<sup>2</sup>, N = L³</>}
        open={skOpen}
        onToggle={() => setSkOpen((o) => !o)}
      >
        <StructureFactorPanel skPath={stats.skPath} latticeSize={latticeSize} />
      </AccordionSection>
      <AccordionSection
        title="C(r)"
        tip="Time-averaged spin-spin correlation C(r)/C(0) along x-axis. FM: flat≈1. PM: decays exponentially. Stripe-x: oscillates ±1."
        open={crOpen}
        onToggle={() => setCrOpen((o) => !o)}
      >
        <CorrelationPanel data={stats.correlationData} latticeSize={latticeSize} />
      </AccordionSection>
      <AccordionSection
        title="Energy Distribution"
        tip="Per-site energy ε = H/(N³|J₁|) sampled each sweep. Converges to a Gaussian by CLT; width σ_ε feeds into Cv = N³ σ_ε² / T*²."
        open={eHistOpen}
        onToggle={() => setEHistOpen((o) => !o)}
      >
        <HistogramPanel
          samples={stats.energySamples}
          samplesFilled={stats.histSamplesFilled}
          xLabel="E"
          barColor="#f97316"
          showGaussian={true}
        />
      </AccordionSection>
      <AccordionSection
        title="Magnetization Distribution"
        tip="M = (1/N³)Σsᵢ sampled each sweep. Bimodal below Tc reflects ergodicity breaking — tunnelling between the ±|M| minima is suppressed on simulation timescales, more strongly for large L."
        open={mHistOpen}
        onToggle={() => setMHistOpen((o) => !o)}
      >
        <HistogramPanel
          samples={stats.magnetizationSamples}
          samplesFilled={stats.histSamplesFilled}
          xLabel="M"
          barColor="#34d399"
          xDomain={[-1.05, 1.05]}
        />
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
              <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/github-mark-white.svg`} alt="GitHub" width={20} height={20} />
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
            <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/github-mark-white.svg`} alt="GitHub" width={20} height={20} />
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
