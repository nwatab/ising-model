import { BitPackedArray } from "./bitpacked-array";
type Coord3D = { x: number; y: number; z: number };

/** count 1 in a byte（Hacker's Delight） */
function popcount(byte: number): number {
  byte -= (byte >> 1) & 0x55;
  byte = (byte & 0x33) + ((byte >> 2) & 0x33);
  return (byte + (byte >> 4)) & 0x0f;
}

export class SpinLattice extends BitPackedArray {
  private readonly N: number;
  constructor(latticeSize: number);
  constructor(other: Uint8Array);
  constructor(arg: number | Uint8Array) {
    if (typeof arg === "number") {
      // allocate fresh array
      const bits = arg ** 3;
      const bytes = Math.ceil(bits / 8);
      super(bytes);
      this.N = arg;
      this.randomize();
    } else {
      // copy‐constructor
      super(arg); // calls BitPackedArray(other)
      this.N = Math.cbrt(arg.length * 8); // lattice size
    }
  }
  get latticeSize(): number {
    return this.N;
  }
  get spinCount(): number {
    return this.N ** 3;
  }

  static createRandom(N: number): SpinLattice {
    const arr = new SpinLattice(N);
    arr.randomize();
    return arr;
  }

  static createFerro(N: number): SpinLattice {
    const lat = new SpinLattice(N);
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          lat.setSpin({ x, y, z }, 1);
    return lat;
  }

  // s(x,y,z) = (−1)^(x+y+z): 3D checkerboard (Néel) state
  static createNeel(N: number): SpinLattice {
    const lat = new SpinLattice(N);
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          lat.setSpin({ x, y, z }, ((x + y + z) & 1) === 0 ? 1 : -1);
    return lat;
  }

  // s(x,y,z) = (−1)^x: ferromagnetic planes alternating along x
  static createLayered(N: number): SpinLattice {
    const lat = new SpinLattice(N);
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          lat.setSpin({ x, y, z }, (x & 1) === 0 ? 1 : -1);
    return lat;
  }

  // s(x,y,z) = (−1)^(y+z): diagonal stripe — ground state of frustrated J1<0 regime
  static createDiagonalLayered(N: number): SpinLattice {
    const lat = new SpinLattice(N);
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          lat.setSpin({ x, y, z }, ((y + z) & 1) === 0 ? 1 : -1);
    return lat;
  }

  randomize(): this {
    const total = this.spinCount;
    for (let i = 0; i < total; i++) {
      this.setBit(i, Math.random() < 0.5 ? 1 : 0);
    }
    return this;
  }
  /** in class BitPackedSpinArray */
  bitIndex({ x, y, z }: Coord3D): number {
    const xp = ((x % this.N) + this.N) % this.N;
    const yp = ((y % this.N) + this.N) % this.N;
    const zp = ((z % this.N) + this.N) % this.N;

    // Color-sorted layout: sites grouped by sublattice color (x%2, y%2, z%2).
    // Within each color block, sites are ordered by (x>>1, y>>1, z>>1).
    // This makes each color's bits contiguous — enabling lock-free parallel writes per color.
    const color = ((xp & 1) << 2) | ((yp & 1) << 1) | (zp & 1);
    const M = this.N >> 1; // N/2
    return color * M * M * M + (xp >> 1) + M * (yp >> 1) + M * M * (zp >> 1);
  }

  /** get a spin at a coordinate（+1 or -1） */
  getSpin(coord: Coord3D): 1 | -1 {
    const idx = this.bitIndex(coord);
    return this.getBit(idx) === 1 ? 1 : -1;
  }

  /** set a spin at a coordinate (+1 or -1） */
  setSpin(coord: Coord3D, spin: 1 | -1): this {
    const idx = this.bitIndex(coord);
    this.setBit(idx, spin === 1 ? 1 : 0);
    return this;
  }

  flipSpin(coord: Coord3D): 1 | -1 {
    const idx = this.bitIndex(coord);
    const spin = this.getBit(idx) === 1 ? 1 : -1;
    this.setBit(idx, spin === 1 ? 0 : 1);
    return -spin as 1 | -1; // flip
  }

  private sumSpins(): number {
    const totalBits = this.spinCount;
    const fullBytes = Math.floor(totalBits / 8);
    let sum = 0;

    // complete bytes
    for (let i = 0; i < fullBytes; i++) {
      const bitsOn = popcount(this[i]);
      sum += 2 * bitsOn - 8; // bitsOn*(+1) + (8-bitsOn)*(-1)
    }

    // remaining bits
    const rem = totalBits % 8;
    if (rem > 0) {
      const mask = (1 << rem) - 1;
      const bitsOn = popcount(this[fullBytes] & mask);
      sum += 2 * bitsOn - rem;
    }

    return sum;
  }

  magnetization(): number {
    return this.sumSpins() / this.spinCount;
  } /** in class BitPackedSpinArray */
  /** in class SpinArray */
  /**
   * Local energy of the spin at `coord`:
   *   –K₁ sᵢ ∑⟨ij⟩ sⱼ − K₂ sᵢ ∑⟪ij⟫ sⱼ − h̃ sᵢ
   */
  energyAt({ x, y, z }: Coord3D, betaJ: number, betaJ2: number, betaH: number): number {
    const s = this.getSpin({ x, y, z });

    // nearest-neighbour sum (6 neighbours)
    const nnSum =
      this.getSpin({ x: x + 1, y, z }) +
      this.getSpin({ x: x - 1, y, z }) +
      this.getSpin({ x, y: y + 1, z }) +
      this.getSpin({ x, y: y - 1, z }) +
      this.getSpin({ x, y, z: z + 1 }) +
      this.getSpin({ x, y, z: z - 1 });

    // next-nearest-neighbour sum (12 face-diagonal neighbours)
    const nnnSum =
      this.getSpin({ x: x + 1, y: y + 1, z }) +
      this.getSpin({ x: x + 1, y: y - 1, z }) +
      this.getSpin({ x: x - 1, y: y + 1, z }) +
      this.getSpin({ x: x - 1, y: y - 1, z }) +
      this.getSpin({ x: x + 1, y, z: z + 1 }) +
      this.getSpin({ x: x + 1, y, z: z - 1 }) +
      this.getSpin({ x: x - 1, y, z: z + 1 }) +
      this.getSpin({ x: x - 1, y, z: z - 1 }) +
      this.getSpin({ x, y: y + 1, z: z + 1 }) +
      this.getSpin({ x, y: y + 1, z: z - 1 }) +
      this.getSpin({ x, y: y - 1, z: z + 1 }) +
      this.getSpin({ x, y: y - 1, z: z - 1 });

    return -betaJ * s * nnSum - betaJ2 * s * nnnSum - betaH * s;
  }

  /** M_AFM = (1/N³) Σᵢ sᵢ (−1)^(xᵢ+yᵢ+zᵢ)  ∈ [−1, 1] */
  neelOrderParam(): number {
    const N = this.N;
    let sum = 0;
    for (let z = 0; z < N; z++)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const sign = ((x + y + z) & 1) === 0 ? 1 : -1;
          sum += sign * this.getSpin({ x, y, z });
        }
    return sum / this.spinCount;
  }

  /**
   * Stripe (layered) order parameter: max over α∈{x,y,z} of
   *   (1/N³)|Σᵢ sᵢ (−1)^{r_α}| = sqrt(S(k_α)/N³)
   * where k_α is the X-point wavevector along axis α.
   * Equals 1 for a perfect layered state, ≈0 for PM.
   */
  stripeOrderParam(): number {
    const H = Math.floor(this.N / 2);
    const N3 = this.spinCount;
    // Checks both single-axis (π,0,0) for J1>0 and diagonal (0,π,π) for J1<0
    return Math.sqrt(
      Math.max(
        this.structureFactorAt(H, 0, 0),
        this.structureFactorAt(0, H, 0),
        this.structureFactorAt(0, 0, H),
        this.structureFactorAt(0, H, H),
        this.structureFactorAt(H, 0, H),
        this.structureFactorAt(H, H, 0),
      ) / N3,
    );
  }

  /**
   * S(k) = (1/N³) |Σᵢ sᵢ exp(i k·rᵢ)|²  at k = (2π/N)(nx, ny, nz)
   *
   * Uses a precomputed LUT so trig is paid only once per instance.
   */
  structureFactorAt(nx: number, ny: number, nz: number): number {
    const N = this.N;
    const cosLUT = this._cosLUT ?? (this._cosLUT = this._buildLUT(true));
    const sinLUT = this._sinLUT ?? (this._sinLUT = this._buildLUT(false));
    let re = 0, im = 0;
    for (let z = 0; z < N; z++) {
      const nzz = (nz * z) % N;
      for (let y = 0; y < N; y++) {
        const nyyNzz = (ny * y + nzz) % N;
        for (let x = 0; x < N; x++) {
          const spin = this.getSpin({ x, y, z });
          const k = (nx * x + nyyNzz) % N;
          re += spin * cosLUT[k];
          im += spin * sinLUT[k];
        }
      }
    }
    return (re * re + im * im) / this.spinCount;
  }

  private _cosLUT?: Float32Array;
  private _sinLUT?: Float32Array;
  private _buildLUT(cosine: boolean): Float32Array {
    const N = this.N;
    const lut = new Float32Array(N);
    const fn = cosine ? Math.cos : Math.sin;
    const f = (2 * Math.PI) / N;
    for (let k = 0; k < N; k++) lut[k] = fn(k * f);
    return lut;
  }

  betaEnergy(betaJ: number, betaJ2: number, betaH: number): number {
    const N = this.N;
    let E_nn = 0;
    let E_nnn = 0;

    for (let z = 0; z < N; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const s = this.getSpin({ x, y, z });

          // NN: count each bond once via +x, +y, +z directions
          E_nn -= betaJ * s * (
            this.getSpin({ x: x + 1, y, z }) +
            this.getSpin({ x, y: y + 1, z }) +
            this.getSpin({ x, y, z: z + 1 })
          );

          // NNN: 6 face-diagonal half-directions, each bond counted once
          E_nnn -= betaJ2 * s * (
            this.getSpin({ x: x + 1, y: y + 1, z }) +
            this.getSpin({ x: x + 1, y: y - 1, z }) +
            this.getSpin({ x: x + 1, y, z: z + 1 }) +
            this.getSpin({ x: x + 1, y, z: z - 1 }) +
            this.getSpin({ x, y: y + 1, z: z + 1 }) +
            this.getSpin({ x, y: y + 1, z: z - 1 })
          );
        }
      }
    }

    const E_field = -betaH * this.sumSpins();
    return E_nn + E_nnn + E_field;
  }
}
