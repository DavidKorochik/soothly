export type InterviewMessage = { role: "assistant" | "user"; content: string; error?: boolean };

// The user's stand-in answer when they skip a question; excluded from the synthesis material.
export const SKIP_MARKER = "(דילגתי על השאלה)";

// Assemble the conversation into the raw answer material synthesis expects: each real answer paired
// with the question that prompted it, skips dropped. The client holds the full, authoritative
// conversation at completion, so this is the most complete source for the book.
export function buildAnswers(messages: InterviewMessage[]): string {
  const parts: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "user" || m.content.trim() === SKIP_MARKER) continue;
    const prev = messages[i - 1];
    // A surfaced UI error (a failed turn the user retried past) is not a real question - never let it
    // leak into the synthesis source; fall back to the bare answer instead.
    const question = prev?.role === "assistant" && !prev.error ? prev.content.trim() : "";
    parts.push(question ? `ש: ${question}\nת: ${m.content.trim()}` : m.content.trim());
  }
  return parts.join("\n\n");
}
