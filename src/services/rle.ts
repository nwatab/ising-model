/**
 * Run-Length Encoding (RLE) and Decoding for Uint8Array
 *
 * This module provides two functions:
 * - rleEncode: Compresses a Uint8Array into RLE format (count, value) pairs.
 * - rleDecode: Decompresses the RLE data back into the original Uint8Array.
 *
 * RLE format: [count1, value1, count2, value2, ...]
 * where each count is a byte (1–255). Longer runs are split across multiple pairs.
 */

/**
 * Encodes a Uint8Array using simple RLE (count, value) pairs.
 * @param input The data to encode.
 * @returns A new Uint8Array containing RLE-encoded data.
 */
export function rleEncode(input: Uint8Array): Uint8Array {
  const chunks: number[] = [];
  const len = input.length;
  if (len === 0) {
    return new Uint8Array();
  }

  let current = input[0];
  let count = 1;

  for (let i = 1; i < len; i++) {
    const byte = input[i];
    if (byte === current && count < 255) {
      count++;
    } else {
      chunks.push(count, current);
      current = byte;
      count = 1;
    }
  }
  // Push the final run
  chunks.push(count, current);

  return Uint8Array.from(chunks);
}

/**
 * Decodes a Uint8Array encoded with the above RLE format.
 * @param input The RLE-encoded data (count, value) pairs.
 * @returns A new Uint8Array with the original data.
 * @throws Error if input length is not even.
 */
export function rleDecode(input: Uint8Array): Uint8Array {
  const output: number[] = [];
  const len = input.length;
  if (len % 2 !== 0) {
    throw new Error("Invalid RLE data: length must be even.");
  }

  for (let i = 0; i < len; i += 2) {
    const count = input[i];
    const value = input[i + 1];
    for (let j = 0; j < count; j++) {
      output.push(value);
    }
  }

  return Uint8Array.from(output);
}

// Example usage:
// const data = new Uint8Array([1,1,1,2,2,3,3,3,3]);
// const encoded = rleEncode(data);
// console.log(encoded); // e.g. Uint8Array [3,1,2,2,4,3]
// const decoded = rleDecode(encoded);
// console.log(decoded); // Uint8Array [1,1,1,2,2,3,3,3,3]
