"use client";

import { beta_hs, beta_js, CRITICAL_BETA_J } from "@/config";
import React from "react";

export default function ConfigSection({
  betaJ,
  betaH,
  z,
  setBetaJ,
  setBetaH,
  setZ,
}: {
  betaJ: number;
  betaH: number;
  z: number;
  setBetaJ: (value: number) => void;
  setBetaH: (value: number) => void;
  setZ: (value: number) => void;
}) {
  const [jSign, setJSign] = React.useState<1 | -1>(
    Math.sign(betaJ + 1e-6) as 1 | -1
  );
  console.log(betaJ);
  console.log(Math.sign(betaJ + 1e6));
  return (
    <form className="text-sm">
      <h2 className="text-lg font-bold mb-4">Parameters</h2>

      <div className="mb-4">
        <div className="flex items-center space-x-6 mb-4">
          <div className="flex items-center">
            <input
              type="radio"
              name="couplingType"
              checked={jSign > 0}
              onChange={() => {
                setJSign(1);
                setBetaJ(Math.abs(betaJ));
              }}
              className="mr-2"
            />
            <label htmlFor="ferromagnetic" className="text-sm">
              J &gt; 0
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              name="couplingType"
              checked={jSign < 0}
              onChange={() => {
                setJSign(-1);
                setBetaJ(-Math.abs(betaJ));
              }}
              className="mr-2"
            />
            <label htmlFor="antiferromagnetic" className="text-sm">
              J &lt; 0
            </label>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          |<span className="italic">J</span>|/<span className="italic"></span>k
          <sub>B</sub>
          <span className="italic">T</span>:
          <span className="ml-1">{Math.abs(betaJ).toFixed(1)}</span>
        </label>
        <input
          type="range"
          name="betaJ"
          min="0"
          max={beta_js[beta_js.length - 1]}
          step="0.1"
          value={Math.abs(betaJ)}
          onChange={(e) => setBetaJ(jSign * parseFloat(e.target.value) || 0)}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mb-4">
          (Critical point &#8776; {CRITICAL_BETA_J.toFixed(2)})
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          <span className="italic">h</span>/<span className="italic">k</span>
          <sub>B</sub>
          <span className="italic">T</span>:
          <span className="ml-1">{betaH.toFixed(1)}</span>
        </label>
        <input
          type="range"
          name="betaH"
          min="0"
          max={beta_hs[beta_hs.length - 1]}
          step="0.1"
          value={betaH}
          onChange={(e) => setBetaH(parseFloat(e.target.value) || 0)}
          className={"w-full mx-auto block"}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          <span className="italic">z</span>:
          <span className="ml-1">{z.toFixed(0)}</span>
        </label>
        <input
          type="range"
          name="z"
          min="0"
          max={Number(process.env.NEXT_PUBLIC_N) - 1}
          step="1"
          value={z}
          onChange={(e) => setZ(parseInt(e.target.value))}
          className={`w-full`}
        />
      </div>
      <h2 className="text-lg font-bold mb-4 mt-4">Property</h2>
      <div className="mb-4">
        <p>
          Magnetism:{" "}
          {Math.abs(betaJ) < CRITICAL_BETA_J
            ? "Paramagnetism"
            : betaJ < 0
              ? "Antiferromagnetism"
              : "Ferromagnetism"}
        </p>
      </div>
    </form>
  );
}
