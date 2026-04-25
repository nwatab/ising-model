import { describe, it, expect } from "vitest";
import { BitPackedArray } from "../bitpacked-array";

describe("BitPackedArray", () => {
  describe("construction", () => {
    it("allocates the right number of bytes", () => {
      const arr = new BitPackedArray(3);
      expect(arr.byteLength).toBe(3);
      expect(arr.bitLength).toBe(24);
    });

    it("initialises all bits to 0", () => {
      const arr = new BitPackedArray(2);
      for (let i = 0; i < arr.bitLength; i++) {
        expect(arr.getBit(i)).toBe(0);
      }
    });

    it("copy-constructs from another Uint8Array", () => {
      const src = new Uint8Array([0b10110001, 0b00001111]);
      const arr = new BitPackedArray(src);
      expect(arr.byteLength).toBe(2);
      expect(arr[0]).toBe(src[0]);
      expect(arr[1]).toBe(src[1]);
    });

    it("rejects non-positive size", () => {
      expect(() => new BitPackedArray(0)).toThrow();
      expect(() => new BitPackedArray(-1)).toThrow();
    });
  });

  describe("getBit / setBit", () => {
    it("sets and reads back individual bits", () => {
      const arr = new BitPackedArray(1);
      arr.setBit(0, 1);
      expect(arr.getBit(0)).toBe(1);
      arr.setBit(0, 0);
      expect(arr.getBit(0)).toBe(0);
    });

    it("sets the last bit in a byte without disturbing others", () => {
      const arr = new BitPackedArray(1);
      arr.setBit(7, 1);
      expect(arr.getBit(7)).toBe(1);
      for (let i = 0; i < 7; i++) expect(arr.getBit(i)).toBe(0);
    });

    it("sets bits across byte boundaries independently", () => {
      const arr = new BitPackedArray(2);
      arr.setBit(7, 1); // last bit of byte 0
      arr.setBit(8, 1); // first bit of byte 1
      expect(arr.getBit(7)).toBe(1);
      expect(arr.getBit(8)).toBe(1);
      expect(arr.getBit(6)).toBe(0);
      expect(arr.getBit(9)).toBe(0);
    });

    it("round-trips all bits in a multi-byte array", () => {
      const arr = new BitPackedArray(3);
      const pattern = [1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1];
      pattern.forEach((v, i) => arr.setBit(i, v as 0 | 1));
      pattern.forEach((v, i) => expect(arr.getBit(i)).toBe(v));
    });

    it("throws on out-of-range get", () => {
      const arr = new BitPackedArray(1);
      expect(() => arr.getBit(-1)).toThrow(RangeError);
      expect(() => arr.getBit(8)).toThrow(RangeError);
    });

    it("throws on out-of-range set", () => {
      const arr = new BitPackedArray(1);
      expect(() => arr.setBit(-1, 1)).toThrow(RangeError);
      expect(() => arr.setBit(8, 0)).toThrow(RangeError);
    });
  });
});
