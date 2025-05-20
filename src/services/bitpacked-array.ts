export class BitPackedArray extends Uint8Array {
  /** Total number of bits = 8 * N */
  public get bitLength(): number {
    return this.byteLength * 8;
  }

  /**
   * Construct a new BitPackedArray.
   * @param byteLength Number of bytes to allocate
   */
  constructor(byteLength: number);
  /**
   * Create a copy of an existing BitPackedArray.
   * @param other The BitPackedArray to copy
   */
  constructor(other: BitPackedArray);
  constructor(arg: number | BitPackedArray) {
    if (typeof arg === "number") {
      if (!Number.isInteger(arg) || arg <= 0) {
        throw new Error("Invalid size: N must be a positive integer (bytes)");
      }
      super(arg);
    } else {
      super(arg);
    }
  }

  /**
   * Get the bit at the specified index (0-based).
   * @param index Bit index [0, bitLength)
   * @returns 0 or 1
   */
  public getBit(index: number): 0 | 1 {
    if (!Number.isInteger(index) || index < 0 || index >= this.bitLength) {
      throw new RangeError(`Bit index out of range: ${index}`);
    }
    const byteIndex = index >> 3; // divide by 8
    const bitIndex = index & 0b111; // mod 8
    return ((this[byteIndex] >> bitIndex) & 1) as 0 | 1;
  }

  /**
   * Set the bit at the specified index (0-based) to 0 or 1.
   * @param index Bit index [0, bitLength)
   * @param value 0 or 1
   */
  public setBit(index: number, value: 0 | 1): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.bitLength) {
      throw new RangeError(`Bit index out of range: ${index}`);
    }
    const byteIndex = index >> 3;
    const bitIndex = index & 0b111;
    if (value) {
      this[byteIndex] |= 1 << bitIndex;
    } else {
      this[byteIndex] &= ~(1 << bitIndex);
    }
  }
}
