import React from "react";

function Tip({ label, tip, children }: { label: React.ReactNode; tip: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between ml-2">
      <span className="relative group font-medium cursor-help">
        {label}
        <span className="ml-0.5 text-blue-400 text-xs align-middle">ⓘ</span>
        <span className="pointer-events-none absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 border border-gray-600 text-gray-200 text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          {tip}
        </span>
      </span>
      {children}
    </div>
  );
}

export default function StatisticalInfo({
  energyPerSite,
  magnetization,
  neelOrderParam,
  stripeOrderParam,
  sweeps,
  phase,
  energyStdDev,
  magnetizationStdDev,
}: {
  energyPerSite: number;
  magnetization: number;
  neelOrderParam: number;
  stripeOrderParam: number;
  sweeps: number;
  phase: string;
  energyStdDev: number | null;
  magnetizationStdDev: number | null;
}) {
  return (
    <div className="text-sm space-y-1">
      <div className="flex justify-between ml-2">
        <span className="font-medium">Phase:</span>
        <span className="text-orange-300">{phase}</span>
      </div>
      <Tip
        label="E/site:"
        tip={<>E/site = H/(N<sup>3</sup>|J<sub>1</sub>|),{"  "}H = −J<sub>1</sub>Σ<sub>⟨ij⟩</sub>s<sub>i</sub>s<sub>j</sub> − J<sub>2</sub>Σ<sub>⟪ij⟫</sub>s<sub>i</sub>s<sub>j</sub> − hΣs<sub>i</sub></>}
      >
        <span>
          {energyPerSite.toFixed(4)}
          {energyStdDev !== null && (
            <span className="text-gray-400"> ± {energyStdDev.toFixed(4)}</span>
          )}{" "}
          <span className="text-gray-400 text-xs">|J<sub>1</sub>|</span>
        </span>
      </Tip>
      <Tip
        label="M:"
        tip={<>M = (1/N<sup>3</sup>) Σ s<sub>i</sub></>}
      >
        <span>
          {magnetization.toFixed(4)}
          {magnetizationStdDev !== null && (
            <span className="text-gray-400"> ± {magnetizationStdDev.toFixed(4)}</span>
          )}
        </span>
      </Tip>
      <Tip
        label={<>M<sub>Néel</sub>:</>}
        tip={<>M<sub>Néel</sub> = (1/N<sup>3</sup>) Σ s<sub>i</sub>(−1)<sup>x<sub>i</sub>+y<sub>i</sub>+z<sub>i</sub></sup></>}
      >
        <span>{(neelOrderParam ?? 0).toFixed(4)}</span>
      </Tip>
      <Tip
        label={<>M<sub>stripe</sub>:</>}
        tip={<>M<sub>stripe</sub> = √(max<sub>k</sub> S(k) / N<sup>6</sup>),{"  "}k ∈ X-point</>}
      >
        <span>{(stripeOrderParam ?? 0).toFixed(4)}</span>
      </Tip>
      <div className="flex justify-between ml-2">
        <span className="font-medium">Sweeps:</span>
        <span>{sweeps}</span>
      </div>
    </div>
  );
}
