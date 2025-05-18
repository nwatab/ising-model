import { SpinArray } from "@/types";

export function Lattice({
  lattice,
  N,
  getIndex,
}: {
  lattice: SpinArray;
  N: number;
  getIndex: (x: number, y: number, z: number, N: number) => number;
}) {
  const z = Math.floor(N / 2); // Middle slice

  const cells = Array.from({ length: N }).flatMap((_, y) =>
    Array.from({ length: N }).flatMap((_, x) => {
      const idx = getIndex(x, y, z, N);
      const spin = lattice[idx];
      const color = spin > 0 ? "bg-orange-800" : "bg-cyan-800";

      return (
        <div
          key={`${x}-${y}`}
          className={`${color} border border-zinc-800`}
          style={{
            gridColumn: x + 1,
            gridRow: y + 1,
          }}
        />
      );
    })
  );

  return cells;
}
