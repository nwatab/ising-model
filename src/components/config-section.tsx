"use client";

import { beta_hs, beta_js } from "@/config";

export default function ConfigSection({
  betaJ,
  betaH,
  setBetaJ,
  setBetaH,
}: {
  betaJ: number;
  betaH: number;
  setBetaJ: (value: number) => void;
  setBetaH: (value: number) => void;
}) {
  return (
    <form className="text-sm mb-8">
      <h2 className="text-lg font-bold mb-4">Parameters</h2>
      <div className="mb-8">
        <label className="block text-sm font-medium mb-1">
          <span className="italic">J</span>/
          <span className="italic">
            k<sub>B</sub>T
          </span>
          :<span className="ml-1">{betaJ.toFixed(1)}</span>
        </label>
        <input
          type="range"
          name="betaJ"
          min={beta_js[0]}
          max={beta_js[beta_js.length - 1]}
          step="0.1"
          value={betaJ}
          onChange={(e) => setBetaJ(parseFloat(e.target.value) || 0)}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mb-4">
          (Critical point &#8776; 0.22)
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          <span className="italic">h</span>/
          <span className="italic">
            k<sub>B</sub>T
          </span>
          :<span className="ml-1">{betaH.toFixed(1)}</span>
        </label>
        <input
          type="range"
          name="betaH"
          min={beta_hs[0]}
          max={beta_hs[beta_hs.length - 1]}
          step="0.1"
          value={betaH}
          onChange={(e) => setBetaH(parseFloat(e.target.value) || 0)}
          className={`w-${beta_hs.length}/${beta_js.length} mx-auto block`}
        />
      </div>
    </form>
  );
}
