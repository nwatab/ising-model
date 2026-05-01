import type { SpinLattice } from "../../public/wasm/ising_core";
export type { SpinLattice as WasmLattice };

// Inline the subset of the generated types we need at runtime,
// so we don't have to bundle the wasm glue through webpack.
interface WasmModule {
  default(wasmUrl: string): Promise<unknown>;
  SpinLattice: {
    new(n: number, seed: bigint): SpinLattice;
    from_bytes(bytes: Uint8Array, n: number, seed: bigint): SpinLattice;
  };
}

let ready: Promise<WasmModule> | null = null;

// Loads the WASM module once; subsequent calls return the cached promise.
// The JS glue is loaded as a native ES module from /wasm/ (public/),
// bypassing webpack so the .wasm binary fetch resolves correctly at runtime.
export function loadWasm(): Promise<WasmModule> {
  if (ready) return ready;
  ready = (async () => {
    const m = await import(
      /* webpackIgnore: true */ "/wasm/ising_core.js" as string
    ) as WasmModule;
    await m.default("/wasm/ising_core_bg.wasm");
    return m;
  })();
  return ready;
}
