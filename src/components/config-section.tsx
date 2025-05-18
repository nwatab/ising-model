"use client";

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
    <form className="text-sm mb-2">
      <div className="mb-4">Parameters:</div>
      <div>
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
          min="-0.5"
          max="0.5"
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
          min="-0.2"
          max="0.2"
          step="0.1"
          value={betaH}
          onChange={(e) => setBetaH(parseFloat(e.target.value) || 0)}
          className="w-full"
        />
      </div>
    </form>
  );
}
