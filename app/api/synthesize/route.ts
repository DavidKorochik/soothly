import { NextResponse } from "next/server";
import { z } from "zod";
import { runSafetyCheck } from "@/lib/safety/check";
import { synthesizeBook } from "@/lib/synthesis/synthesize";
import { renderPdf } from "@/lib/pdf/render";
import { storePdf } from "@/lib/storage/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // long-form synthesis; the gate is validated locally where no cap applies

const InputSchema = z.object({
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

  const safety = await runSafetyCheck(input.answers);
  if (!safety.proceed) {
    return NextResponse.json({ status: "flagged", message: safety.message });
  }

  try {
    const book = await synthesizeBook(input);
    const pdf = await renderPdf(book, input.name);
    const key = await storePdf(pdf, `${crypto.randomUUID()}.pdf`);
    const url = `/api/book/${key}`;
    return NextResponse.json({ status: "ok", url, title: book.title, chapters: book.chapters.length });
  } catch (error) {
    console.error("synthesis pipeline failed", error);
    return NextResponse.json({ status: "error", message: "משהו השתבש ביצירת הספר. אפשר לנסות שוב." }, { status: 500 });
  }
}
