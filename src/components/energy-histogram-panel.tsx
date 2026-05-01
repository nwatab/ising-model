"use client";
import { useMemo } from "react";

const PANEL_W = 220;
const CHART_H = 80;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 24;
const CHART_W = PANEL_W - PAD_L - PAD_R;
const N_BINS = 20;

function buildHistogram(samples: Float32Array) {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    if (samples[i] < min) min = samples[i];
    if (samples[i] > max) max = samples[i];
  }
  const mean = sum / samples.length;

  let variance = 0;
  for (let i = 0; i < samples.length; i++) variance += (samples[i] - mean) ** 2;
  const std = Math.sqrt(variance / samples.length);

  const pad = std * 0.5 || Math.abs(max - min) * 0.1 || 0.1;
  const lo = min - pad;
  const hi = max + pad;
  const binWidth = (hi - lo) / N_BINS;

  const bins = new Array<number>(N_BINS).fill(0);
  for (let i = 0; i < samples.length; i++) {
    bins[Math.min(Math.floor((samples[i] - lo) / binWidth), N_BINS - 1)]++;
  }

  const edges = Array.from({ length: N_BINS + 1 }, (_, i) => lo + i * binWidth);
  return { bins, edges, mean, std };
}

export default function HistogramPanel({
  samples,
  samplesFilled,
  xLabel,
  barColor,
  showGaussian = false,
}: {
  samples: Float32Array | null;
  samplesFilled: number;
  xLabel: string;
  barColor: string;
  showGaussian?: boolean;
}) {
  const viewH = CHART_H + PAD_T + PAD_B;

  const hist = useMemo(
    () => (samples ? buildHistogram(samples) : null),
    [samples]
  );

  const bars = useMemo(() => {
    if (!hist) return null;
    const { bins, edges } = hist;
    const maxCount = Math.max(...bins, 1);
    return bins.map((count, i) => {
      const x0 = PAD_L + ((edges[i] - edges[0]) / (edges[N_BINS] - edges[0])) * CHART_W;
      const x1 = PAD_L + ((edges[i + 1] - edges[0]) / (edges[N_BINS] - edges[0])) * CHART_W;
      const barH = (count / maxCount) * CHART_H;
      return (
        <rect
          key={i}
          x={x0 + 0.5}
          y={PAD_T + CHART_H - barH}
          width={Math.max(x1 - x0 - 1, 0.5)}
          height={barH}
          fill={barColor}
          opacity={0.8}
        />
      );
    });
  }, [hist, barColor]);

  // Gaussian overlay: peak = 1.0 maps to y=PAD_T (top of chart), matching tallest bar
  const gaussianPath = useMemo(() => {
    if (!showGaussian || !hist || hist.std < 1e-10) return null;
    const { edges, mean, std } = hist;
    const lo = edges[0];
    const hi = edges[N_BINS];
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const e = lo + (i / 80) * (hi - lo);
      const p = Math.exp(-((e - mean) ** 2) / (2 * std ** 2));
      pts.push(
        `${(PAD_L + ((e - lo) / (hi - lo)) * CHART_W).toFixed(1)},` +
        `${(PAD_T + CHART_H * (1 - p)).toFixed(1)}`
      );
    }
    return pts.join(" ");
  }, [hist, showGaussian]);

  const xLabels = useMemo(() => {
    if (!hist) return null;
    const lo = hist.edges[0];
    const hi = hist.edges[N_BINS];
    return [lo, (lo + hi) / 2, hi].map((v) => ({
      x: PAD_L + ((v - lo) / (hi - lo)) * CHART_W,
      label: v.toFixed(2),
    }));
  }, [hist]);

  return (
    <div>
      <svg width={PANEL_W} height={viewH} className="block" style={{ fontFamily: "inherit" }}>
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H} stroke="#6b7280" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H} stroke="#6b7280" strokeWidth={1} />

        <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize={8} fill="#9ca3af">freq</text>

        {xLabels?.map(({ x, label }) => (
          <text key={label} x={x} y={PAD_T + CHART_H + 12} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {label}
          </text>
        ))}

        <text x={PAD_L + CHART_W + 4} y={PAD_T + CHART_H + 4} textAnchor="start" fontSize={9} fill="#9ca3af" fontStyle="italic">
          {xLabel}
        </text>

        {bars ?? (
          <text x={PAD_L + CHART_W / 2} y={PAD_T + CHART_H / 2} textAnchor="middle" fontSize={9} fill="#6b7280">
            {samplesFilled > 0 ? `collecting… ${samplesFilled}/20` : "start simulation"}
          </text>
        )}

        {gaussianPath && (
          <polyline points={gaussianPath} fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeLinejoin="round" opacity={0.85} />
        )}
        {showGaussian && hist && (
          <text x={PAD_L + CHART_W} y={PAD_T + 9} textAnchor="end" fontSize={7.5} fill="#60a5fa">
            Gaussian fit
          </text>
        )}
      </svg>

      {hist && (
        <div className="text-xs text-gray-400 mt-0.5 leading-tight">
          <span>μ={hist.mean.toFixed(3)}</span>
          <span className="ml-2">σ={hist.std.toFixed(3)}</span>
          <span className="ml-2">n={samples!.length}</span>
        </div>
      )}
    </div>
  );
}
