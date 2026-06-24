import type { Violation } from "../quality/decide";

// The pure core of the targeted repair — no model calls, so it stays unit-testable on its own.

// Literal replace-all via split/join — no regex, so a `$` in the replacement is never read as a
// special pattern and a regex-special char in `find` is matched literally.
export function replaceAllLiteral(text: string, find: string, replace: string): string {
  if (!find) return text;
  return text.split(find).join(replace);
}

// The ordered sequence of [MARKER] tokens (same shape parseBook keys on). Its invariance is the
// structural contract a patch must keep: a stray bracketed token in a model replacement would let
// parseBook silently mis-split chapters, so a changed sequence means the patch corrupted the book.
export function markerSequence(s: string): string {
  return (s.match(/\[[A-Z0-9_]+\]/g) ?? []).join(",");
}

// Apply each flagged quote -> suggestion directly where the quote is found verbatim. Returns the
// patched text and the violations whose quote could not be located (left for the bounded model patch).
export function applyDirectFixes(
  raw: string,
  violations: Violation[],
): { patched: string; unresolved: Violation[] } {
  let patched = raw;
  const unresolved: Violation[] = [];
  for (const v of violations) {
    if (v.suggestion.trim() && patched.includes(v.quote)) {
      patched = replaceAllLiteral(patched, v.quote, v.suggestion);
    } else {
      unresolved.push(v);
    }
  }
  return { patched, unresolved };
}
