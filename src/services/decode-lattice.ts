import { rleDecode } from "./rle";

type SnapshotRecord = {
  lattice: string;   // base64-encoded (possibly compressed) spin bytes
  compress: string;  // "none" | "rle" | "deflate"
  lattice_size: number;
};

async function inflateDeflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function decodeLattice(record: SnapshotRecord): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(record.lattice), (c) => c.charCodeAt(0));

  if (record.compress === "none") return bytes;
  if (record.compress === "rle") return rleDecode(bytes);
  if (record.compress === "deflate") return inflateDeflate(bytes);

  throw new Error(`Unknown compress format: ${record.compress}`);
}
