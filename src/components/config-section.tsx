"use client";

import { beta_hs, temperatures, CRITICAL_TEMP } from "@/config";
import {
  getBetaJ,
  getTemperatureFromBetaJ,
} from "@/services/physical_quantity";
import React from "react";

export default function ConfigSection({
  betaJMag,
  setBetaJMag,
  jSign,
  setJSign,
  betaH,
  setBetaH,
  z,
  setZ,
  latticeSize,
}: {
  betaJMag: number;
  setBetaJMag: React.Dispatch<React.SetStateAction<number>>;
  jSign: 1 | -1;
  setJSign: React.Dispatch<React.SetStateAction<1 | -1>>;
  betaH: number;
  setBetaH: React.Dispatch<React.SetStateAction<(typeof beta_hs)[number]>>;
  z: number;
  setZ: React.Dispatch<React.SetStateAction<number>>;
  latticeSize: number;
}) {
  const criticalBetaJ = getBetaJ(CRITICAL_TEMP, CRITICAL_TEMP);
  const temperature = getTemperatureFromBetaJ(betaJMag, CRITICAL_TEMP);

  return (
    <form className="text-sm mb-4 max-w-full sm:max-w-sm mx-auto">
      <h2 className="text-base sm:text-lg font-bold mb-2">Parameters</h2>

      <div className="mb-4 ml-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <label className="text-sm" title="J > 0">
              <input
                type="radio"
                name="magneticType"
                checked={jSign > 0}
                onChange={() => {
                  setJSign(1);
                }}
                className="mr-2"
              />
              Para/Ferro
            </label>
          </div>
          <div className="flex items-center">
            <label className="text-sm" title="J < 0">
              <input
                type="radio"
                name="magneticType"
                checked={jSign < 0}
                onChange={() => {
                  setJSign(-1);
                }}
                className="mr-2"
              />
              Para/Antiferro
            </label>
          </div>
        </div>
      </div>
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          Inverse temperature <span className="italic">β</span>
          <span className="italic">J</span>
          <span className="mx-1">=</span>
          <span>{betaJMag.toFixed(3)}</span>
        </label>
        <input
          type="range"
          name="temperature"
          list="temperature-ticks"
          min={temperatures[0]}
          max={temperatures[temperatures.length - 1]}
          step={temperatures[1] - temperatures[0]}
          value={temperature}
          onChange={(e) => {
            const temp = parseFloat(e.target.value) as (typeof temperatures)[number];
            setBetaJMag(getBetaJ(temp, CRITICAL_TEMP));
          }}
          className="w-full"
        />
        <datalist id="temperature-ticks">
          {temperatures.map((temp) => (
            <option key={temp} value={temp} />
          ))}
        </datalist>
        <div className="text-xs text-gray-400 mb-4">
          (Critical <span className="italic">β</span>
          <sub>c</sub>
          <span className="italic">J</span> ={" "}
          {criticalBetaJ.toFixed(3)})
        </div>
      </div>
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          External field <span className="italic">β</span>
          <span className="italic">h</span>
          <span className="mx-1">=</span>
          {betaH.toFixed(1)}
        </label>
        <input
          type="range"
          name="betaH"
          list="betah-ticks"
          min={beta_hs[0]}
          max={beta_hs[beta_hs.length - 1]}
          step={beta_hs[1] - beta_hs[0]}
          value={betaH}
          onChange={(e) =>
            setBetaH(parseFloat(e.target.value) as (typeof beta_hs)[number])
          }
          className="w-full mx-auto block"
        />
        <datalist id="betah-ticks">
          {beta_hs.map((betah) => (
            <option key={betah} value={betah} />
          ))}
        </datalist>
      </div>

      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          Slice at <span className="italic">z</span>
          <span className="mx-1">=</span>
          {z.toFixed(0)}
        </label>
        <input
          type="range"
          name="z"
          min="0"
          max={latticeSize - 1}
          step="1"
          value={z}
          onChange={(e) => setZ(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    </form>
  );
}
