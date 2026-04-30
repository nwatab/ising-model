"use client";
import { useMemo } from "react";
import { skPathSegments } from "@/hooks/useSimulation";

const PANEL_W = 220;
const CHART_H = 80;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 24;
const CHART_W = PANEL_W - PAD_L - PAD_R;

export default function StructureFactorPanel({
  skPath,
  latticeSize,
}: {
  skPath: Float32Array | null;
  latticeSize: number;
}) {
  const segments = useMemo(() => skPathSegments(latticeSize), [latticeSize]);

  const viewH = CHART_H + PAD_T + PAD_B;
  const viewW = PANEL_W;

  const polyline = useMemo(() => {
    if (!skPath || skPath.length === 0) return null;
    const maxS = Math.max(...skPath, 1e-6);
    const pts: string[] = [];
    for (let i = 0; i < skPath.length; i++) {
      const x = PAD_L + (i / (skPath.length - 1)) * CHART_W;
      const y = PAD_T + CHART_H * (1 - skPath[i] / maxS);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [skPath]);

  const yLabels = [0, 0.5, 1.0];

  return (
    <div>
      <svg
        width={viewW}
        height={viewH}
        className="block"
        style={{ fontFamily: "inherit" }}
      >
        {/* Axes */}
        <line
          x1={PAD_L} y1={PAD_T}
          x2={PAD_L} y2={PAD_T + CHART_H}
          stroke="#6b7280" strokeWidth={1}
        />
        <line
          x1={PAD_L} y1={PAD_T + CHART_H}
          x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
          stroke="#6b7280" strokeWidth={1}
        />

        {/* y-axis tick labels */}
        {yLabels.map((v) => {
          const y = PAD_T + CHART_H * (1 - v);
          return (
            <g key={v}>
              <line
                x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y}
                stroke="#6b7280" strokeWidth={1}
              />
              <text
                x={PAD_L - 5} y={y + 3}
                textAnchor="end" fontSize={8} fill="#9ca3af"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Segment dividers + labels */}
        {segments.map(({ label, idx }) => {
          const x = PAD_L + (idx / (skPath ? skPath.length - 1 : 1)) * CHART_W;
          return (
            <g key={`${label}-${idx}`}>
              <line
                x1={x} y1={PAD_T}
                x2={x} y2={PAD_T + CHART_H}
                stroke="#374151" strokeWidth={1} strokeDasharray="3,2"
              />
              <text
                x={x} y={PAD_T + CHART_H + 12}
                textAnchor="middle" fontSize={9} fill="#d1d5db"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* S(k) curve */}
        {polyline ? (
          <polyline
            points={polyline}
            fill="none"
            stroke="#f97316"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ) : (
          <text
            x={PAD_L + CHART_W / 2} y={PAD_T + CHART_H / 2}
            textAnchor="middle" fontSize={9} fill="#6b7280"
          >
            running…
          </text>
        )}
      </svg>
    </div>
  );
}
