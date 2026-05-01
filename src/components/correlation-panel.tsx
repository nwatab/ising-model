"use client";
import { useMemo } from "react";

const PANEL_W = 220;
const CHART_H = 80;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;
const CHART_W = PANEL_W - PAD_L - PAD_R;

export default function CorrelationPanel({
  data,
  latticeSize,
}: {
  data: Float32Array | null;
  latticeSize: number;
}) {
  const viewH = CHART_H + PAD_T + PAD_B;
  const rMax = data ? data.length - 1 : Math.floor(latticeSize / 2);

  const { polyline, yMin, yMax } = useMemo(() => {
    if (!data || data.length === 0) return { polyline: null, yMin: -1, yMax: 1 };
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const yMin = lo < -0.05 ? -1 : 0;
    const yMax = 1;
    const span = yMax - yMin;
    const pts: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = PAD_L + (i / (data.length - 1)) * CHART_W;
      const v = Math.max(yMin, Math.min(yMax, data[i]));
      const y = PAD_T + CHART_H * (1 - (v - yMin) / span);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return { polyline: pts.join(" "), yMin, yMax };
  }, [data]);

  const ySpan = yMax - yMin;
  const svgY = (v: number) => PAD_T + CHART_H * (1 - (v - yMin) / ySpan);
  const y0 = svgY(0);
  const yTicks = yMin < 0 ? [-1, 0, 1] : [0, 0.5, 1];
  const xTicks = [0, Math.round(rMax / 2), rMax];

  return (
    <div>
      <svg
        width={PANEL_W}
        height={viewH}
        className="block"
        style={{ fontFamily: "inherit" }}
      >
        {/* y=0 reference line */}
        <line
          x1={PAD_L} y1={y0} x2={PAD_L + CHART_W} y2={y0}
          stroke="#374151" strokeWidth={1} strokeDasharray="3,2"
        />

        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
          stroke="#6b7280" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
          stroke="#6b7280" strokeWidth={1} />

        {/* y-axis ticks */}
        {yTicks.map((v) => {
          const y = svgY(v);
          return (
            <g key={v}>
              <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y}
                stroke="#6b7280" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 3}
                textAnchor="end" fontSize={8} fill="#9ca3af">
                {v === -1 ? "−1" : v.toFixed(v === 0 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        {/* x-axis ticks */}
        {xTicks.map((r) => {
          const x = PAD_L + (r / rMax) * CHART_W;
          return (
            <g key={r}>
              <line x1={x} y1={PAD_T + CHART_H} x2={x} y2={PAD_T + CHART_H + 3}
                stroke="#6b7280" strokeWidth={1} />
              <text x={x} y={PAD_T + CHART_H + 12}
                textAnchor="middle" fontSize={8} fill="#9ca3af">
                {r}
              </text>
            </g>
          );
        })}

        {/* x-axis label */}
        <text x={PAD_L + CHART_W + 4} y={PAD_T + CHART_H + 4}
          textAnchor="start" fontSize={9} fill="#9ca3af" fontStyle="italic">
          r
        </text>

        {/* C(r) curve */}
        {polyline ? (
          <polyline
            points={polyline}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ) : (
          <text x={PAD_L + CHART_W / 2} y={PAD_T + CHART_H / 2}
            textAnchor="middle" fontSize={9} fill="#6b7280">
            running…
          </text>
        )}
      </svg>
    </div>
  );
}
