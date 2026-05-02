import React from "react";

function Tip({ label, tip, children }: { label: React.ReactNode; tip: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="relative flex justify-between ml-2 group">
      <span className="font-medium cursor-help">
        {label}
        <span className="ml-0.5 text-blue-400 text-xs align-middle">ⓘ</span>
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-900 border border-gray-600 text-gray-200 text-xs px-2 py-1.5 rounded w-64 z-50 leading-relaxed max-h-[35vh] overflow-y-auto">
        {tip}
      </span>
      {children}
    </div>
  );
}

function formatWithUncertainty(mean: number, stdev: number): [string, string] {
  if (stdev <= 0) return [mean.toFixed(4), stdev.toFixed(4)];
  const decimals = Math.max(0, -Math.floor(Math.log10(stdev)) + 1);
  return [mean.toFixed(decimals), stdev.toFixed(decimals)];
}

function fmtNum(x: number): string {
  if (x >= 9999.5) return `${(x / 1000).toFixed(1)}k`;
  if (x >= 99.95) return x.toFixed(0);
  if (x >= 9.995) return x.toFixed(1);
  return x.toFixed(2);
}

const TIP_ENERGY = (
  <>
    Energy per site in units of |J₁| (k<sub>B</sub> = 1; N ≡ L³ = total sites).<br />
    H = −J₁Σ<sub>⟨ij⟩</sub>s<sub>i</sub>s<sub>j</sub> − J₂Σ<sub>⟪ij⟫</sub>s<sub>i</sub>s<sub>j</sub> − hΣs<sub>i</sub><br />
    ε = H / (N|J₁|).<br />
    Ground state (FM, J₁ &gt; 0, J₂ = 0, h = 0): ε = −3 (6 NN bonds × ½ per site).<br />
    High-T limit: ε → 0.<br />
    Shown as mean ± 1σ once ≥ 20 sweeps are sampled.
  </>
);

const TIP_MAG = (
  <>
    Ferromagnetic order parameter.<br />
    M = (1/N) Σ s<sub>i</sub> ∈ [−1, +1].<br />
    Below T<sub>c</sub> (FM): |M| → 1 as T → 0 (spontaneous symmetry breaking at h = 0).<br />
    Above T<sub>c</sub>: time-average ⟨M⟩ = 0.<br />
    A bimodal magnetisation histogram indicates ergodicity breaking in the ordered phase.
  </>
);

const TIP_NEEL = (
  <>
    Staggered magnetisation — order parameter for Néel antiferromagnetism.<br />
    M<sub>Néel</sub> = (1/N) Σ s<sub>i</sub>(−1)<sup>x<sub>i</sub>+y<sub>i</sub>+z<sub>i</sub></sup><br />
    → ±1 in a perfect checkerboard; 0 in the paramagnetic phase.<br />
    Néel order is stable for J₁ &lt; 0, |J₂/J₁| ≲ 1/2 (3D SC lattice).
  </>
);

const TIP_STRIPE = (
  <>
    Stripe order parameter.<br />
    M<sub>stripe</sub> = max<sub>α</sub> √(S(k<sub>α</sub>) / N),<br />
    k<sub>α</sub> ∈ {"{"}(π,0,0), (0,π,0), (0,0,π){"}"} (X-points of the 3D SC Brillouin zone).<br />
    Detects layered phases where spins modulate along a single axis.<br />
    Ground-state boundaries (3D SC): stripe ↔ FM at |J₂/J₁| = 1/4 (FM J₁); stripe ↔ Néel at |J₂/J₁| = 1/2 (AFM J₁).
  </>
);

const TIP_CV = (
  <>
    Specific heat per site (k<sub>B</sub> = 1).<br />
    C<sub>v</sub> = N · Var(ε) / T*² — fluctuation-dissipation theorem.<br />
    Diverges at T<sub>c</sub> in the thermodynamic limit (critical exponent α ≈ 0.11 for 3D Ising).<br />
    Finite-size peak scales as L<sup>α/ν</sup> ≈ L<sup>0.17</sup> — nearly flat for large L.<br />
    Requires ≥ 20 energy samples.
  </>
);

const TIP_CHI = (
  <>
    Magnetic susceptibility per site.<br />
    χ = N · Var(M) / T* — fluctuation-dissipation theorem.<br />
    Diverges at T<sub>c</sub> (critical exponent γ ≈ 1.24).<br />
    Finite-system peak height scales as L<sup>γ/ν</sup> ≈ L<sup>1.97</sup>.<br />
    Requires ≥ 20 magnetisation samples.
  </>
);

const TIP_XI = (
  <>
    Second-moment correlation length in lattice units.<br />
    ξ = (1/|δk|) · √[S<sub>conn</sub>(k*) / S<sub>conn</sub>(k*+δk) − 1],<br />
    where k* is the ordering wavevector (Γ for FM, R for Néel AFM).<br />
    Diverges at T<sub>c</sub> in infinite systems (ν ≈ 0.63). In finite systems it saturates near L/2.<br />
    Near T*<sub>c</sub>, Metropolis dynamics slows critically: τ ~ L<sup>z</sup> (z ≈ 2).
    For L = 128, ~10⁴ MCS are needed to reach equilibrium — ξ &gt; L/2 after a few hundred sweeps reflects non-equilibrium coarsening, not a true divergence.<br />
    Display: "waiting" = collecting data · &lt; a = below one lattice spacing · &gt; L/2 = deeply ordered or coarsening.
  </>
);

export default function StatisticalInfo({
  energyPerSite,
  magnetization,
  neelOrderParam,
  stripeOrderParam,
  sweeps,
  phase,
  energyStdDev,
  magnetizationStdDev,
  heatCapacity,
  susceptibility,
  correlationLength,
  latticeSize,
}: {
  energyPerSite: number;
  magnetization: number;
  neelOrderParam: number;
  stripeOrderParam: number;
  sweeps: number;
  phase: string;
  energyStdDev: number | null;
  magnetizationStdDev: number | null;
  heatCapacity: number | null;
  susceptibility: number | null;
  correlationLength: number | null;
  latticeSize: number;
}) {
  const [eMean, eStd] = energyStdDev !== null
    ? formatWithUncertainty(energyPerSite, energyStdDev)
    : [energyPerSite.toFixed(4), null];
  const [mMean, mStd] = magnetizationStdDev !== null
    ? formatWithUncertainty(magnetization, magnetizationStdDev)
    : [magnetization.toFixed(4), null];

  return (
    <div className="text-sm space-y-1">
      <div className="flex justify-between ml-2">
        <span className="font-medium">Phase:</span>
        <span className="text-orange-300">{phase}</span>
      </div>
      <Tip label="ε:" tip={TIP_ENERGY}>
        <span>
          {eMean}
          {eStd !== null && <span className="text-gray-400"> ± {eStd}</span>}{" "}
          <span className="text-gray-400 text-xs">|J<sub>1</sub>|</span>
        </span>
      </Tip>
      <Tip label="M:" tip={TIP_MAG}>
        <span>
          {mMean}
          {mStd !== null && <span className="text-gray-400"> ± {mStd}</span>}
        </span>
      </Tip>
      <Tip label={<>M<sub>Néel</sub>:</>} tip={TIP_NEEL}>
        <span>{(neelOrderParam ?? 0).toFixed(4)}</span>
      </Tip>
      <Tip label={<>M<sub>stripe</sub>:</>} tip={TIP_STRIPE}>
        <span>{(stripeOrderParam ?? 0).toFixed(4)}</span>
      </Tip>
      <Tip label={<>C<sub>v</sub>:</>} tip={TIP_CV}>
        <span>{heatCapacity !== null ? fmtNum(heatCapacity) : <span className="text-gray-500 text-xs">waiting</span>}</span>
      </Tip>
      <Tip label="χ:" tip={TIP_CHI}>
        <span>{susceptibility !== null ? fmtNum(susceptibility) : <span className="text-gray-500 text-xs">waiting</span>}</span>
      </Tip>
      <Tip label="ξ:" tip={TIP_XI}>
        <span>
          {correlationLength === null
            ? <span className="text-gray-500 text-xs">waiting</span>
            : correlationLength === 0
            ? <span className="text-gray-400 text-xs">&lt; a</span>
            : correlationLength > latticeSize / 2
            ? <span className="text-yellow-400">&gt; L/2</span>
            : <>{correlationLength.toFixed(2)} <span className="text-gray-400 text-xs">a</span></>}
        </span>
      </Tip>
      <div className="flex justify-between ml-2">
        <span className="font-medium">Sweeps:</span>
        <span>{sweeps}</span>
      </div>
    </div>
  );
}
