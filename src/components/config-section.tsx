"use client";

import { T_STAR_MIN, T_STAR_MAX, T_STAR_STEP, H_MIN, H_MAX, H_STEP } from "@/config";
import { T_STAR_CRITICAL } from "@/constants";

export default function ConfigSection({
  tStar,
  setTStar,
  jSign,
  setJSign,
  h,
  setH,
  z,
  setZ,
  latticeSize,
}: {
  tStar: number;
  setTStar: (v: number) => void;
  jSign: 1 | -1;
  setJSign: (v: 1 | -1) => void;
  h: number;
  setH: (v: number) => void;
  z: number;
  setZ: (v: number) => void;
  latticeSize: number;
}) {
  return (
    <form className="text-sm mb-4 max-w-full sm:max-w-sm mx-auto">
      <h2 className="text-base sm:text-lg font-bold mb-2">Parameters</h2>

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

      {/* T* slider */}
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          T* = k<sub>B</sub>T / |J₁|
          <span className="mx-1">=</span>
          <span>{tStar.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={T_STAR_MIN}
          max={T_STAR_MAX}
          step={T_STAR_STEP}
          value={tStar}
          onChange={(e) => setTStar(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-400">
          T*<sub>c</sub> ≈ {T_STAR_CRITICAL.toFixed(2)}
        </div>
      </div>

      {/* h slider */}
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          External field h / |J₁|
          <span className="mx-1">=</span>
          {h.toFixed(2)}
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

      {/* z-slice slider */}
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          Slice z<span className="mx-1">=</span>{z}
        </label>
        <input
          type="range"
          min={0}
          max={latticeSize - 1}
          step={1}
          value={z}
          onChange={(e) => setZ(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    </form>
  );
}
