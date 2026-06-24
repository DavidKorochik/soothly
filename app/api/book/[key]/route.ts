import { readPdf } from "@/lib/storage/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only a bare "<uuid>.pdf" key is valid — blocks path traversal into the blob store / disk.
const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY_RE.test(key)) {
    return new Response("הספר לא נמצא", { status: 404 });
  }

  let stream: ReadableStream<Uint8Array> | null;
  try {
    stream = await readPdf(key);
  } catch (error) {
    console.error("book retrieval failed", error);
    return new Response("משהו השתבש בטעינת הספר. אפשר לנסות שוב.", { status: 500 });
  }

  if (!stream) {
    console.warn(`book not found for key ${key}`);
    return new Response("הספר לא נמצא", { status: 404 });
  }

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${key}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
