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
  }

  /**
   * Local energy of the spin at `(x, y, z)` coordinate:
   *   –J sᵢ ∑⟨i,j⟩ sⱼ  − H sᵢ − J₂ sᵢ ∑⟨⟨i,k⟩⟩ sₖ
   */
  betaEnergyOfSpinAt(
    { x, y, z }: Coord3D,
    betaJ: number,
    betaH: number,
    betaJ2: number
  ): number {
    const s = this.getSpin({ x, y, z });

    // sum over the six nearest neighbours with periodic wrapping
    const sxp = this.getSpin({ x: x + 1, y, z });
    const sxm = this.getSpin({ x: x - 1, y, z });
    const syp = this.getSpin({ x, y: y + 1, z });
    const sym = this.getSpin({ x, y: y - 1, z });
    const szp = this.getSpin({ x, y, z: z + 1 });
    const szm = this.getSpin({ x, y, z: z - 1 });

    const neighbourSum = sxp + sxm + syp + sym + szp + szm;

    // sum over the twelve second nearest neighbours (face diagonals)
    let secondNeighbourSum = 0;
    if (betaJ2 !== 0) {
      // xy face diagonals
      secondNeighbourSum += this.getSpin({ x: x + 1, y: y + 1, z });
      secondNeighbourSum += this.getSpin({ x: x + 1, y: y - 1, z });
      secondNeighbourSum += this.getSpin({ x: x - 1, y: y + 1, z });
      secondNeighbourSum += this.getSpin({ x: x - 1, y: y - 1, z });

      // xz face diagonals
      secondNeighbourSum += this.getSpin({ x: x + 1, y, z: z + 1 });
      secondNeighbourSum += this.getSpin({ x: x + 1, y, z: z - 1 });
      secondNeighbourSum += this.getSpin({ x: x - 1, y, z: z + 1 });
      secondNeighbourSum += this.getSpin({ x: x - 1, y, z: z - 1 });

      // yz face diagonals
      secondNeighbourSum += this.getSpin({ x, y: y + 1, z: z + 1 });
      secondNeighbourSum += this.getSpin({ x, y: y + 1, z: z - 1 });
      secondNeighbourSum += this.getSpin({ x, y: y - 1, z: z + 1 });
      secondNeighbourSum += this.getSpin({ x, y: y - 1, z: z - 1 });
    }

    // interaction energy plus field energy
    // E = -J₁ sᵢ ∑ⱼ sⱼ - J₂ sᵢ ∑ₖ sₖ - H sᵢ
    // where J₂ = J₁ * j2j1ratio

    return (
      -betaJ * s * neighbourSum - betaJ2 * s * secondNeighbourSum - betaH * s
    );
  }

  betaEnergy(betaJ: number, betaH: number, betaJ2: number = 0): number {
    const N = this.N;
    const N2 = N * N;
    let E_int = 0;
    let E_int2 = 0; // second nearest neighbor energy
    let idx = 0;

    // 1) loop once over every spin, track linear idx
    for (let z = 0; z < N; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++, idx++) {
          // inline getSpin:
          const byte = idx >> 3; // floor(idx/8)
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

          // accumulate nearest neighbor energy
          E_int -= betaJ * (s * sx + s * sy + s * sz);

          // accumulate second nearest neighbor energy if betaJ2 != 0
          if (betaJ2 !== 0) {
            // Only count positive direction neighbors to avoid double counting
            // xy face diagonals
            const xp_yp = ((x + 1) % N) + N * ((y + 1) % N) + N2 * z;
            const xp_ym = ((x + 1) % N) + N * ((y - 1 + N) % N) + N2 * z;
            const s_xp_yp = (this[xp_yp >> 3] >> (xp_yp & 7)) & 1 ? 1 : -1;
            const s_xp_ym = (this[xp_ym >> 3] >> (xp_ym & 7)) & 1 ? 1 : -1;

            // xz face diagonals
            const xp_zp = ((x + 1) % N) + N * y + N2 * ((z + 1) % N);
            const xp_zm = ((x + 1) % N) + N * y + N2 * ((z - 1 + N) % N);
            const s_xp_zp = (this[xp_zp >> 3] >> (xp_zp & 7)) & 1 ? 1 : -1;
            const s_xp_zm = (this[xp_zm >> 3] >> (xp_zm & 7)) & 1 ? 1 : -1;

            // yz face diagonals
            const yp_zp = x + N * ((y + 1) % N) + N2 * ((z + 1) % N);
            const yp_zm = x + N * ((y + 1) % N) + N2 * ((z - 1 + N) % N);
            const s_yp_zp = (this[yp_zp >> 3] >> (yp_zp & 7)) & 1 ? 1 : -1;
            const s_yp_zm = (this[yp_zm >> 3] >> (yp_zm & 7)) & 1 ? 1 : -1;

            E_int2 -=
              betaJ2 *
              s *
              (s_xp_yp + s_xp_ym + s_xp_zp + s_xp_zm + s_yp_zp + s_yp_zm);
          }
        }
      }
    }

    // 2) uniform field term: -βH ∑ᵢ sᵢ
    const sum = this.sumSpins(); // net ∑ s_i over all N³ spins
    const E_field = -betaH * sum;

    return E_int + E_int2 + E_field;
  }
}

export function mergeLattices(...lattices: SpinLattice[]): SpinLattice {
  if (lattices.length < 2) {
    throw new Error(
      `Need at least two lattices to merge, got ${lattices.length}`
    );
  }

  const N = lattices[0].latticeSize;
  // make sure they all have the same size
  for (const lat of lattices) {
    if (lat.latticeSize !== N) {
      throw new Error(
        `Lattice sizes must match. Got ${N} and ${lat.latticeSize}`
      );
    }
  }

  const out = new SpinLattice(N);

  for (let i = 0; i < N; i++) {
    // gather the byte at index i from each lattice
    let andByte = 0xff; // will end up with 1s only where all bits = 1
    let orByte = 0x00; // will end up with 0s only where all bits = 0
    for (const lat of lattices) {
      const v = lat[i];
      andByte &= v;
      orByte |= v;
    }

    // bits that differ across lattices:
    const diff = orByte ^ andByte;

    // any bit where all lattices agree—AND=1 (all 1) or OR=0 (all 0)
    // common bits are exactly those in andByte (1s where all 1, 0s where all 0)
    const common = andByte;

    // randomize only the differing bits
    const randomByte = Math.floor(Math.random() * 256);
    const randomBits = randomByte & diff;

    out[i] = (common | randomBits) & 0xff;
  }

  return out;
}
