import { describe, it, expect } from "vitest";
import { rleEncode, rleDecode } from "../rle";

describe("rleEncode", () => {
  it("encodes an empty array to an empty array", () => {
    expect(rleEncode(new Uint8Array())).toEqual(new Uint8Array());
  });

  it("encodes a single byte", () => {
    expect(rleEncode(new Uint8Array([42]))).toEqual(
      new Uint8Array([1, 42])
    );
  });

  it("encodes a run of identical bytes", () => {
    const input = new Uint8Array(5).fill(7);
    expect(rleEncode(input)).toEqual(new Uint8Array([5, 7]));
  });

  it("encodes alternating bytes as individual pairs", () => {
    const input = new Uint8Array([1, 2, 1, 2]);
    expect(rleEncode(input)).toEqual(
      new Uint8Array([1, 1, 1, 2, 1, 1, 1, 2])
    );
  });

  it("splits a run of 256 identical bytes into two pairs (max run = 255)", () => {
    const input = new Uint8Array(256).fill(0xff);
    const encoded = rleEncode(input);
    // Must be split: [255, 0xff, 1, 0xff]
    expect(encoded).toEqual(new Uint8Array([255, 0xff, 1, 0xff]));
  });

  it("handles a run of exactly 255 bytes without splitting", () => {
    const input = new Uint8Array(255).fill(0xaa);
    expect(rleEncode(input)).toEqual(new Uint8Array([255, 0xaa]));
  });

  it("encodes mixed runs correctly", () => {
    const input = new Uint8Array([3, 3, 3, 9, 9]);
    expect(rleEncode(input)).toEqual(new Uint8Array([3, 3, 2, 9]));
  });
});

describe("rleDecode", () => {
  it("decodes an empty array to an empty array", () => {
    expect(rleDecode(new Uint8Array())).toEqual(new Uint8Array());
  });

  it("decodes a single pair", () => {
    expect(rleDecode(new Uint8Array([3, 0xab]))).toEqual(
      new Uint8Array([0xab, 0xab, 0xab])
    );
  });

  it("throws on odd-length input", () => {
    expect(() => rleDecode(new Uint8Array([1]))).toThrow();
    expect(() => rleDecode(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe("rleEncode → rleDecode round-trip", () => {
  it("round-trips an empty array", () => {
    const input = new Uint8Array();
    expect(rleDecode(rleEncode(input))).toEqual(input);
  });

  it("round-trips all-same bytes", () => {
    const input = new Uint8Array(100).fill(0xcc);
    expect(rleDecode(rleEncode(input))).toEqual(input);
  });

  it("round-trips random-like bytes", () => {
    const input = new Uint8Array(200).map((_, i) => (i * 37 + 13) % 256);
    expect(rleDecode(rleEncode(input))).toEqual(input);
  });

  it("round-trips a 256-byte all-same array (tests split handling)", () => {
    const input = new Uint8Array(256).fill(0x55);
    expect(rleDecode(rleEncode(input))).toEqual(input);
  });

  it("round-trips mixed short and long runs", () => {
    const input = new Uint8Array([
      ...new Uint8Array(3).fill(1),
      ...new Uint8Array(300).fill(2),
      ...new Uint8Array(1).fill(3),
    ]);
    expect(rleDecode(rleEncode(input))).toEqual(input);
  });
});
