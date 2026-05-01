import { SpinLattice } from "./spin-lattice";

const SPIN_UP_RGB = [0xe0, 0xcb, 0x96] as const;
const SPIN_DOWN_RGB = [0x31, 0x34, 0x38] as const;

export type SliceAxis = "x" | "y" | "z";

// axis=z: pixel(u,v) → spin(x=u, y=v, z=index)  — xy plane
// axis=y: pixel(u,v) → spin(x=u, y=index, z=v)  — xz plane
// axis=x: pixel(u,v) → spin(x=index, y=u, z=v)  — yz plane
export function renderSliceToImageData(
  lattice: SpinLattice,
  axis: SliceAxis,
  index: number,
): ImageData {
  const N = lattice.latticeSize;
  const imageData = new ImageData(N, N);
  const d = imageData.data;
  for (let v = 0; v < N; v++) {
    for (let u = 0; u < N; u++) {
      const coords =
        axis === "z" ? { x: u, y: v, z: index } :
        axis === "y" ? { x: u, y: index, z: v } :
                       { x: index, y: u, z: v };
      const spin = lattice.getSpin(coords);
      const [r, g, b] = spin > 0 ? SPIN_UP_RGB : SPIN_DOWN_RGB;
      const i = (v * N + u) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  return imageData;
}

export function drawTiledOnCanvas(
  ctx: CanvasRenderingContext2D,
  tile: ImageData,
  tileSize: number
): void {
  const { width, height } = ctx.canvas;
  const N = tile.width;

  const offscreen = new OffscreenCanvas(N, N);
  const offCtx = offscreen.getContext("2d")!;
  offCtx.putImageData(tile, 0, 0);

  ctx.imageSmoothingEnabled = false;
  for (let ty = 0; ty < height; ty += tileSize) {
    for (let tx = 0; tx < width; tx += tileSize) {
      ctx.drawImage(offscreen, tx, ty, tileSize, tileSize);
    }
  }
}
