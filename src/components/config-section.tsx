"use client";

import { beta_hs, CRITICAL_TEMP, temperatures, j2j1ratio } from "@/config";
import { getBetaJ } from "@/services/physical_quantity";
import React from "react";

export default function ConfigSection({
  temperature,
  setTemperature,
  jSign,
  setJSign,
  betaH,
  setBetaH,
  j2j1Ratio,
  setJ2j1Ratio,
  z,
  setZ,
  latticeSize,
}: {
  temperature: number;
  setTemperature: React.Dispatch<
    React.SetStateAction<(typeof temperatures)[number]>
  >;
  jSign: 1 | -1;
  setJSign: React.Dispatch<React.SetStateAction<1 | -1>>;
  betaH: number;
  setBetaH: React.Dispatch<React.SetStateAction<(typeof beta_hs)[number]>>;
  j2j1Ratio: number;
  setJ2j1Ratio: React.Dispatch<React.SetStateAction<(typeof j2j1ratio)[number]>>;
  z: number;
  setZ: React.Dispatch<React.SetStateAction<number>>;
  latticeSize: number;
}) {
  function format(num: number): string {
    const formatter = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
    const formatted = formatter.format(num); // "1 234 567,89"
    const formattedDot = formatted.replace(",", "."); // "1 234 567.89"
    return formattedDot;
  }

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
          Temperature <span className="italic">T</span>
          <span className="mx-1">=</span>
          <span>{format(temperature)}</span>
          <span className="mx-1">K</span>
        </label>
        <input
          type="range"
          name="temperature"
          list="temperature-ticks"
          min={temperatures[0]}
          max={temperatures[temperatures.length - 1]}
          step={temperatures[1] - temperatures[0]}
          value={temperature}
          onChange={(e) =>
            setTemperature(
              parseFloat(e.target.value) as (typeof temperatures)[number]
            )
          }
          className="w-full"
        />
        <datalist id="temperature-ticks">
          {temperatures.map((temp) => (
            <option key={temp} value={temp} />
          ))}
        </datalist>
        <div className="text-xs text-gray-400 mb-4">
          (Critical <span className="italic">T</span> &#8776;{" "}
          {format(CRITICAL_TEMP)} K)
        </div>
      </div>
      <div className="mb-4 ml-2">
        <label className="block text-sm font-medium mb-1">
          External field <span className="italic">h</span>/
          <span className="italic">J</span>
          <span className="mx-1">=</span>
          {(betaH / getBetaJ(temperature, CRITICAL_TEMP)).toFixed(2)}
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
          2nd neighbor coupling <span className="italic">J₂</span>/
          <span className="italic">J₁</span>
          <span className="mx-1">=</span>
          {j2j1Ratio.toFixed(2)}
        </label>
        <input
          type="range"
          name="j2j1Ratio"
          list="j2j1-ticks"
          min={j2j1ratio[0]}
          max={j2j1ratio[j2j1ratio.length - 1]}
          step={j2j1ratio[1] - j2j1ratio[0]}
          value={j2j1Ratio}
          onChange={(e) =>
            setJ2j1Ratio(parseFloat(e.target.value) as (typeof j2j1ratio)[number])
          }
          className="w-full mx-auto block"
        />
        <datalist id="j2j1-ticks">
          {j2j1ratio.map((ratio) => (
            <option key={ratio} value={ratio} />
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
