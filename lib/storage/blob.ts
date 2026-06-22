import fs from "node:fs";
import path from "node:path";
import { put, get } from "@vercel/blob";

// Book PDFs are stored PRIVATELY: retrieval goes through our own route (app/api/book/[key]),
// never a public URL — the synthesized life story is intimate. Without a Blob token (local dev)
// we fall back to disk so the pipeline still runs end-to-end. The fallback dir is deliberately
// NOT under public/ — anything there is served unauthenticated at the site root.
const BLOB_PREFIX = "books";
const LOCAL_DIR = path.join(process.cwd(), ".books");

// On Vercel a missing token means the Blob store is misconfigured; refuse the disk fallback
// (which can't persist on Vercel anyway) and fail with a named error instead of a misleading 500.
function ensureLocalFallbackOk(): void {
  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing in a Vercel deployment; refusing the local-disk fallback.");
  }
}

export async function storePdf(bytes: Uint8Array, filename: string): Promise<string> {
  const buf = Buffer.from(bytes);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(`${BLOB_PREFIX}/${filename}`, buf, {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    return filename;
  }

  ensureLocalFallbackOk();
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
  return filename;
}

// Retrieve a stored PDF by its key as a web stream, or null if it isn't there.
export async function readPdf(filename: string): Promise<ReadableStream<Uint8Array> | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(`${BLOB_PREFIX}/${filename}`, { access: "private" });
    return result?.stream ?? null;
  }

  ensureLocalFallbackOk();
  const file = path.join(LOCAL_DIR, filename);
  if (!fs.existsSync(file)) return null;
  return new Response(fs.readFileSync(file)).body;
}
