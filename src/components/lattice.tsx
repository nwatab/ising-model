import { SpinArray } from "@/services/ising";
import type { JSX } from "react";

export function Lattice({
  lattice,
  N,
  getIndex,
}: {
  lattice: SpinArray;
  N: number;
  getIndex: (x: number, y: number, z: number, N: number) => number;
}) {
  const cells: JSX.Element[] = [];
  const z = Math.floor(N / 2); // Middle slice

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = getIndex(x, y, z, N);
      const spin = lattice[idx];
      const color = spin > 0 ? "bg-orange-800" : "bg-cyan-800";

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`${color} border border-zinc-800`}
          style={{
            gridColumn: x + 1,
            gridRow: y + 1,
          }}
        />
      );
    }
  }

  return cells;
}
