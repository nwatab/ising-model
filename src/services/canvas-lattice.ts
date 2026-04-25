import { SpinLattice } from "./spin-lattice";

const SPIN_UP_RGB = [0xe0, 0xcb, 0x96] as const;
const SPIN_DOWN_RGB = [0x31, 0x34, 0x38] as const;

export function renderSliceToImageData(lattice: SpinLattice, z: number): ImageData {
  const N = lattice.latticeSize;
  const imageData = new ImageData(N, N);
  const d = imageData.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const spin = lattice.getSpin({ x, y, z });
      const [r, g, b] = spin > 0 ? SPIN_UP_RGB : SPIN_DOWN_RGB;
      const i = (y * N + x) * 4;
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
