"use client";
import { useMemo, useRef, useEffect } from "react";
import type { PhaseDiagramData } from "@/types";

const CELL_W = 14;
const CELL_H = 10;
const PAD_L = 28;
const PAD_B = 32;
const PAD_T = 8;
const PAD_R = 8;
const THRESHOLD = 0.15;

function phaseColor(M: number, M_AFM: number, M_stripe: number): [number, number, number, number] {
  if (M > THRESHOLD)        return [234, 120, 40,  220]; // orange — FM
  if (M_AFM > THRESHOLD)    return [60,  120, 230, 220]; // blue   — Néel AFM
  if (M_stripe > THRESHOLD) return [200, 80,  200, 220]; // purple — Striped AFM
  return [90, 90, 100, 180];                              // gray   — PM
}

export default function PhaseDiagramPanel({
  data,
  jSign,
  tStar,
  j2OverJ1,
}: {
  data: PhaseDiagramData;
  jSign: 1 | -1;
  tStar: number;
  j2OverJ1: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filtered = useMemo(
    () => data.entries.filter((e) => e.jSign === jSign),
    [data, jSign],
  );

  const J2S = data.j2OverJ1Values;
  const TS = data.tStarValues;
  const nJ = J2S.length;
  const nT = TS.length;
  const canvasW = PAD_L + nJ * CELL_W + PAD_R;
  const canvasH = PAD_T + nT * CELL_H + PAD_B;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nJ === 0 || nT === 0) return;
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw phase cells
    for (const e of filtered) {
      const ji = J2S.indexOf(e.j2OverJ1);
      const ti = TS.indexOf(e.tStar);
      if (ji < 0 || ti < 0) continue;
      const [r, g, b, a] = phaseColor(e.M, e.M_AFM, e.M_stripe ?? 0);
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      // Invert y so high T* is at top
      const x = PAD_L + ji * CELL_W;
      const y = PAD_T + (nT - 1 - ti) * CELL_H;
      ctx.fillRect(x, y, CELL_W, CELL_H);
    }

    // x-axis labels (J₂/J₁)
    ctx.fillStyle = "#9ca3af";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    for (let ji = 0; ji < nJ; ji += 2) {
      const x = PAD_L + ji * CELL_W + CELL_W / 2;
      ctx.fillText(J2S[ji].toFixed(1), x, canvasH - 16);
    }
    ctx.fillStyle = "#d1d5db";
    ctx.font = "9px sans-serif";
    ctx.fillText("J₂/J₁", PAD_L + (nJ * CELL_W) / 2, canvasH - 4);

    // y-axis labels (T*)
    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.font = "8px sans-serif";
    for (let ti = 0; ti < nT; ti += 2) {
      const y = PAD_T + (nT - 1 - ti) * CELL_H + CELL_H / 2 + 3;
      ctx.fillText(TS[ti].toFixed(1), PAD_L - 3, y);
    }
    ctx.save();
    ctx.translate(9, PAD_T + (nT * CELL_H) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#d1d5db";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("T*", 0, 0);
    ctx.restore();

    // Current position marker
    if (nJ > 0 && nT > 0) {
      const clampedJ2 = Math.max(J2S[0], Math.min(J2S[nJ - 1], j2OverJ1));
      const clampedT = Math.max(TS[0], Math.min(TS[nT - 1], tStar));
      const jFrac = (clampedJ2 - J2S[0]) / (J2S[nJ - 1] - J2S[0]);
      const tFrac = (clampedT - TS[0]) / (TS[nT - 1] - TS[0]);
      const mx = PAD_L + jFrac * (nJ * CELL_W);
      const my = PAD_T + (1 - tFrac) * (nT * CELL_H);
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [filtered, J2S, TS, nJ, nT, canvasW, canvasH, j2OverJ1, tStar]);

  return (
    <div>
      {nJ === 0 ? (
        <p className="text-xs text-gray-500 ml-2">
          Run <code>pnpm run phase-diagram</code> to generate data.
        </p>
      ) : (
        <>
          <canvas ref={canvasRef} className="block" />
          <div className="flex gap-3 mt-1 ml-1 flex-wrap">
            {[
              { color: "bg-orange-500", label: "FM" },
              { color: "bg-blue-500",   label: "AFM" },
              { color: "bg-purple-500", label: "Striped" },
              { color: "bg-gray-500",   label: "PM" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-xs text-gray-400">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
