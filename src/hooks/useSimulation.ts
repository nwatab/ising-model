"use client";
import { useEffect, useRef } from "react";
import { SpinLattice } from "@/services/spin-lattice";
import { simulateMetropoliseSweepLattice } from "@/services/metropolis";
import { renderSliceToImageData, drawTiledOnCanvas } from "@/services/canvas-lattice";

const FRAMES_PER_SWEEP = 6; // one full lattice sweep every 6 frames (~10/s at 60 fps)
const PIXELS_PER_SPIN = 16;

export type SimStats = {
  magnetization: number;
  betaEnergyPerSite: number;
  sweeps: number;
};

export function useSimulation({
  canvasRef,
  initialSpins,
  betaJ,
  betaJ2,
  betaH,
  z,
  running,
  onStats,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  initialSpins: Uint8Array;
  betaJ: number;
  betaJ2: number;
  betaH: number;
  z: number;
  running: boolean;
  onStats: (stats: SimStats) => void;
}) {
  const latticeRef = useRef<SpinLattice>(new SpinLattice(initialSpins));
  const paramsRef = useRef({ betaJ, betaJ2, betaH, z });
  const runningRef = useRef(running);
  const onStatsRef = useRef(onStats);
  const sweepsRef = useRef(0);
  const frameRef = useRef(0);

  paramsRef.current = { betaJ, betaJ2, betaH, z };
  runningRef.current = running;
  onStatsRef.current = onStats;

  useEffect(() => {
    latticeRef.current = new SpinLattice(initialSpins);
    sweepsRef.current = 0;
  }, [initialSpins]);

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  useEffect(() => {
    let animId: number;

    const tick = () => {
      const { betaJ, betaJ2, betaH, z } = paramsRef.current;

      frameRef.current++;
      if (runningRef.current && frameRef.current % FRAMES_PER_SWEEP === 0) {
        latticeRef.current = simulateMetropoliseSweepLattice(
          latticeRef.current,
          betaJ,
          betaJ2,
          betaH
        );
        sweepsRef.current++;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const N = latticeRef.current.latticeSize;
          const tileSize = PIXELS_PER_SPIN * N;
          const imageData = renderSliceToImageData(latticeRef.current, z);
          drawTiledOnCanvas(ctx, imageData, tileSize);
        }
      }

      onStatsRef.current({
        magnetization: latticeRef.current.magnetization(),
        betaEnergyPerSite:
          latticeRef.current.betaEnergy(betaJ, betaJ2, betaH) /
          latticeRef.current.spinCount,
        sweeps: sweepsRef.current,
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []); // intentionally empty — all mutable state accessed via refs
}
