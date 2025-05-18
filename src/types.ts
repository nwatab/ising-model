export type SpinArray = Int8Array & {
  readonly [index: number]: -1 | 1;
};

export type GetIndexFn = (x: number, y: number, z: number, N: number) => number;
