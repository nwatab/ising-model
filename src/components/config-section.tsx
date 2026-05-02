"use client";

import { useRef } from "react";
import { T_STAR_LOG_MIN, T_STAR_LOG_MAX, H_MIN, H_MAX, H_STEP, J2_MIN, J2_MAX, J2_STEP } from "@/config";
import { T_STAR_CRITICAL } from "@/constants";

const LOG_MIN = Math.log10(T_STAR_LOG_MIN);
const LOG_MAX = Math.log10(T_STAR_LOG_MAX);
const SLIDER_STEPS = 1000;

const sliderToTStar = (v: number): number =>
  Math.pow(10, LOG_MIN + (v / SLIDER_STEPS) * (LOG_MAX - LOG_MIN));

const tStarToSlider = (t: number): number =>
  Math.round(SLIDER_STEPS * (Math.log10(t) - LOG_MIN) / (LOG_MAX - LOG_MIN));

const getPercent = (t: number): number =>
  100 * (Math.log10(t) - LOG_MIN) / (LOG_MAX - LOG_MIN);

export default function ConfigSection({
  tStar,
  setTStar,
  jSign,
  setJSign,
  j2OverJ1,
  setJ2OverJ1,
  h,
  setH,
}: {
  tStar: number;
  setTStar: (v: number) => void;
  jSign: 1 | -1;
  setJSign: (v: 1 | -1) => void;
  j2OverJ1: number;
  setJ2OverJ1: (v: number) => void;
  h: number;
  setH: (v: number) => void;
}) {
  const isInf = !isFinite(tStar);
  const lastFiniteRef = useRef<number>(isFinite(tStar) ? tStar : T_STAR_CRITICAL);
  if (!isInf) lastFiniteRef.current = tStar;

  const handleInfToggle = () => {
    if (isInf) {
      setTStar(lastFiniteRef.current);
    } else {
      lastFiniteRef.current = tStar;
      setTStar(Infinity);
    }
  };

  const sliderValue = isInf ? tStarToSlider(T_STAR_LOG_MAX) : tStarToSlider(tStar);

  const snapPoints = [
    { t: T_STAR_LOG_MIN, label: <>0.5</> },
    { t: 1.0, label: <>1</> },
    { t: T_STAR_CRITICAL, label: <>T<sup>*</sup><sub>c</sub></> },
    { t: 10.0, label: <>10</> },
    { t: T_STAR_LOG_MAX, label: <>20</> },
  ];

  return (
    <form className="text-sm mb-2 max-w-full sm:max-w-sm mx-auto">

      {/* J₁ sign toggle */}
      <div className="mb-4 ml-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 mb-4 space-y-2 sm:space-y-0">
          <label className="flex items-center text-sm" title="J₁ > 0">
            <input
              type="radio"
              name="j1sign"
              checked={jSign > 0}
              onChange={() => setJSign(1)}
              className="mr-2"
            />
            Ferro (J₁ &gt; 0)
          </label>
          <label className="flex items-center text-sm" title="J₁ < 0">
            <input
              type="radio"
              name="j1sign"
              checked={jSign < 0}
              onChange={() => setJSign(-1)}
              className="mr-2"
            />
            Antiferro (J₁ &lt; 0)
          </label>
        </div>
      </div>

      {/* T* log-scale slider */}
      <div className="mb-6 ml-2">
        <div className="text-xs text-gray-400 mb-0.5">Reduced temperature</div>
        <div className="flex items-center gap-1 text-sm font-medium mb-1">
          <span className="relative group cursor-help">
            T<sup>*</sup>
            <span className="ml-0.5 text-blue-400 text-xs align-middle">ⓘ</span>
            <span className="pointer-events-none absolute top-full left-0 mt-1 hidden group-hover:block bg-gray-900 border border-gray-600 text-gray-200 text-xs px-2 py-1.5 rounded w-64 z-50 font-normal leading-relaxed max-h-[50vh] overflow-y-auto">
              Reduced temperature T* = k<sub>B</sub>T / |J<sub>1</sub>| (dimensionless; k<sub>B</sub> = |J<sub>1</sub>| = 1).<br />
              Controls the balance between thermal fluctuations and spin-coupling energy.<br />
              Critical point for the 3D simple-cubic Ising model: T*<sub>c</sub> ≈ 4.51 (K<sub>c</sub> = J<sub>1</sub>/k<sub>B</sub>T<sub>c</sub> ≈ 0.2217).<br />
              Near T*<sub>c</sub>, relaxation time τ ~ L<sup>z</sup> (z ≈ 2 for Metropolis) ~ 10⁴ MCS for L = 128. Run longer to approach equilibrium.
            </span>
          </span>
          <span>= <span className="font-mono">{isInf ? "∞" : tStar.toFixed(2)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <input
              type="range"
              min={0}
              max={SLIDER_STEPS}
              step={1}
              value={sliderValue}
              disabled={isInf}
              onChange={(e) => setTStar(sliderToTStar(parseInt(e.target.value)))}
              className={`w-full transition-opacity ${isInf ? "opacity-30 cursor-not-allowed" : ""}`}
            />
            {/* Clickable snap-point labels */}
            <div className={`relative h-5 mt-1 transition-opacity ${isInf ? "opacity-30" : ""}`}>
              {snapPoints.map(({ t, label }) => {
                const pct = getPercent(t);
                const active =
                  !isInf &&
                  Math.abs(Math.log10(tStar) - Math.log10(t)) < 0.05;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTStar(t)}
                    disabled={isInf}
                    className={`absolute text-xs -translate-x-1/2 transition-colors ${
                      active ? "text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                    style={{ left: `${pct}%` }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleInfToggle}
            className={`px-1.5 py-0.5 text-xs rounded border transition-colors self-start ${
              isInf
                ? "bg-blue-600 border-blue-500 text-white"
                : "border-gray-500 text-gray-400 hover:text-white hover:border-gray-300"
            }`}
          >
            ∞
          </button>
        </div>
      </div>

      {/* h slider */}
      <div className="mb-4 ml-2">
        <div className="text-xs text-gray-400 mb-0.5">External field</div>
        <label className="block text-sm font-medium mb-1">
          h / |J₁| = <span className="font-mono">{h.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={H_MIN}
          max={H_MAX}
          step={H_STEP}
          value={h}
          onChange={(e) => setH(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* J₂ slider */}
      <div className="mb-4 ml-2">
        <div className="text-xs text-gray-400 mb-0.5">Next-nearest coupling</div>
        <label className="block text-sm font-medium mb-1">
          J<sub>2</sub> / |J<sub>1</sub>| = <span className="font-mono">{j2OverJ1.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={J2_MIN}
          max={J2_MAX}
          step={J2_STEP}
          value={j2OverJ1}
          onChange={(e) => setJ2OverJ1(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

    </form>
  );
}
