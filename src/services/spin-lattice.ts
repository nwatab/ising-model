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
    arr.randomize(); // randomize the spins
    return arr;
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
    // wrap each coord into [0, N):
    const xp = ((x % this.N) + this.N) % this.N;
    const yp = ((y % this.N) + this.N) % this.N;
    const zp = ((z % this.N) + this.N) % this.N;

    // now compute the 1D bit index
    return xp + this.N * yp + this.N * this.N * zp;
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
   *   –J sᵢ ∑⟨i,j⟩ sⱼ  − H sᵢ
   */
  energyAt({ x, y, z }: Coord3D, betaJ: number, betaH: number): number {
    const s = this.getSpin({ x, y, z });

    // sum over the six neighbours with periodic wrapping
    const sxp = this.getSpin({ x: x + 1, y, z });
    const sxm = this.getSpin({ x: x - 1, y, z });
    const syp = this.getSpin({ x, y: y + 1, z });
    const sym = this.getSpin({ x, y: y - 1, z });
    const szp = this.getSpin({ x, y, z: z + 1 });
    const szm = this.getSpin({ x, y, z: z - 1 });

    const neighbourSum = sxp + sxm + syp + sym + szp + szm;

    // interaction energy plus field energy
    return -betaJ * s * neighbourSum - betaH * s;
  }

  betaEnergy(betaJ: number, betaH: number): number {
    const N = this.N;
    const N2 = N * N;
    let E_int = 0;
    let idx = 0;

    // 1) loop once over every spin, track linear idx
    for (let z = 0; z < N; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++, idx++) {
          // inline getSpin:
          const byte = idx >> 3; // loor(idx/8)
          const offset = idx & 0b111; // mod 8
          const s = (this[byte] >> offset) & 1 ? 1 : -1;

          // +x neighbour (wrapped)
          const idxX = x < N - 1 ? idx + 1 : idx - (N - 1);
          const sx = (this[idxX >> 3] >> (idxX & 7)) & 1 ? 1 : -1;

          // +y neighbour (wrapped)
          const idxY = y < N - 1 ? idx + N : idx - N * (N - 1);
          const sy = (this[idxY >> 3] >> (idxY & 7)) & 1 ? 1 : -1;

          // +z neighbour (wrapped)
          const idxZ = z < N - 1 ? idx + N2 : idx - N2 * (N - 1);
          const sz = (this[idxZ >> 3] >> (idxZ & 7)) & 1 ? 1 : -1;

          // accumulate internal energy
          E_int -= betaJ * (s * sx + s * sy + s * sz);
        }
      }
    }

    // 2) uniform field term: -βH ∑ᵢ sᵢ
    const sum = this.sumSpins(); // net ∑ s_i over all N³ spins
    const E_field = -betaH * sum;

    return E_int + E_field;
  }
}

export function mergeLatices(a: SpinLattice, b: SpinLattice): SpinLattice {
  if (a.latticeSize !== b.latticeSize) {
    throw new Error(
      "Lattice sizes must match. Got " + a.latticeSize + " and " + b.latticeSize
    );
  }
  const N = a.latticeSize;
  const out = new SpinLattice(N);

  for (let i = 0; i < N; i++) {
    const ai = a[i];
    const bi = b[i];

    // 1) Which bits differ?
    const diff = ai ^ bi; // bit = 1 where they differ

    // 2) Keep the bits that are the same
    //    (~diff) has 1s where they match, but ~diff is 32-bit, so mask down to a byte:
    const sameMask = ~diff & 0xff;
    const common = ai & sameMask; // those matching bits

    // 3) For the differing bits, pick random bits:
    //    generate a random byte (0–255) whose bits are each 50/50, then mask to only the differing bits
    const randomByte = Math.floor(Math.random() * 256);
    const randomBits = randomByte & diff;

    // 4) Combine
    out[i] = common | randomBits;
  }

  return out;
}
