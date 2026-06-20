import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";

export async function storePdf(bytes: Uint8Array, filename: string): Promise<string> {
  const buf = Buffer.from(bytes);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(`books/${filename}`, buf, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });
    return url;
  }

  // ponytail: local-dev fallback so the gate runs without a Blob token; prod always has one.
  const dir = path.join(process.cwd(), "public", "_books");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buf);
  return `/_books/${filename}`;
}
