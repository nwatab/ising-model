import { SpinLattice } from "./spin-lattice";

export function generateSVGDataURL(lattice: SpinLattice, z: number): string {
  const N = lattice.latticeSize;
  if (z < 0 || z >= lattice.latticeSize) {
    throw new Error(`z must be in [0, ${N}). Got ${z}`);
  }

  const rects = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const spin = lattice.getSpin({ x, y, z });
      const fill =
        spin > 0
          ? "oklch(47% 0.157 37.304)" /* orange-800 */
          : "oklch(45% 0.085 224.283)"; /* cyan-800 */
      rects.push(
        `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" />`
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
                width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">
               ${rects.join("")}
             </svg>`;
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return svgDataUrl;
}

export function getTileSize(pixelsPerCell: number, N: number) {
  return pixelsPerCell * N;
}
