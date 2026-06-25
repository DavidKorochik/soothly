import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBook } from "@/lib/synthesis/pipeline";
import { getSessionBook, setBookKey } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // long-form synthesis; the gate is validated locally where no cap applies

const InputSchema = z.object({
  sessionId: z.string().uuid().optional(), // present from the interview; absent from the internal test page
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female"]),
  age: z.coerce.number().int().min(1).max(120),
  answers: z.string().trim().min(1).max(100000),
});

export async function POST(req: Request) {
  let input: z.infer<typeof InputSchema>;
  try {
    input = InputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ status: "error", message: "משהו לא נראה תקין. אפשר לנסות שוב." }, { status: 400 });
  }

  const { sessionId, ...synthInput } = input;
  try {
    // Idempotency: a reload during the long synthesis wait re-POSTs here. If this session already has a
    // synthesized book, serve it instead of re-running the full safety + ~180s synthesis + PDF pipeline
    // (a fresh, billed generation under a new key). Lookup fails open, so a DB hiccup just regenerates.
    if (sessionId) {
      const existing = await getSessionBook(sessionId);
      if (existing?.status === "synthesized" && existing.bookKey) {
        return NextResponse.json({ status: "ok", url: `/api/book/${existing.bookKey}` });
      }
    }

    const result = await generateBook(synthInput);
    if (result.status === "flagged") {
      return NextResponse.json({ status: "flagged", message: result.message });
    }
    if (sessionId) await setBookKey(sessionId, result.key);
    return NextResponse.json({ status: "ok", url: `/api/book/${result.key}`, title: result.title, chapters: result.chapters });
  } catch (error) {
    console.error("synthesis pipeline failed", error);
    return NextResponse.json({ status: "error", message: "משהו השתבש ביצירת הספר. אפשר לנסות שוב." }, { status: 500 });
  }
}
