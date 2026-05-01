/* tslint:disable */
/* eslint-disable */

export class SpinLattice {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Raw bitpacked bytes (color-sorted layout), for copying to JS.
     */
    data(): Uint8Array;
    static from_bytes(bytes: Uint8Array, n: number, seed: bigint): SpinLattice;
    get_spin(x: number, y: number, z: number): number;
    lattice_size(): number;
    magnetization(): number;
    neel_order_param(): number;
    constructor(n: number, seed: bigint);
    randomize(): void;
    sublattice_sweep(k1: number, k2: number, h: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_spinlattice_free: (a: number, b: number) => void;
    readonly spinlattice_data: (a: number) => [number, number];
    readonly spinlattice_from_bytes: (a: number, b: number, c: number, d: bigint) => number;
    readonly spinlattice_get_spin: (a: number, b: number, c: number, d: number) => number;
    readonly spinlattice_lattice_size: (a: number) => number;
    readonly spinlattice_magnetization: (a: number) => number;
    readonly spinlattice_neel_order_param: (a: number) => number;
    readonly spinlattice_new: (a: number, b: bigint) => number;
    readonly spinlattice_randomize: (a: number) => void;
    readonly spinlattice_sublattice_sweep: (a: number, b: number, c: number, d: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
