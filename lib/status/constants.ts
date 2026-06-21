// Soothly leans on two external AI providers: Anthropic (Claude) writes every piece of text -
// the interview questions and the synthesized book - and OpenAI (gpt-4o-transcribe) turns spoken
// answers into text. When either provider's API degrades, we surface a calm notice instead of
// letting the product silently stall. Health comes from each vendor's public Statuspage feed.

export const STATUS_REVALIDATE_SECONDS = 60;

// Abort a stalled feed quickly - Node's built-in fetch otherwise hangs ~5 minutes on a connection
// that stalls before sending headers, which would pin the serverless invocation that long.
export const STATUS_TIMEOUT_MS = 5_000;

// Anthropic moved its status page to status.claude.com; status.anthropic.com 302-redirects here.
export const ANTHROPIC_STATUS_URL = "https://status.claude.com/api/v2/summary.json";
export const OPENAI_STATUS_URL = "https://status.openai.com/api/v2/summary.json";

// Statuspage lists many components per page (claude.ai, Console, Voice mode, ...); we only watch
// the ones our calls actually hit. Matched case-insensitively as substrings against each name.
// Keying off these specific components - not the page-wide indicator - avoids false alarms when an
// unrelated surface (claude.ai, ChatGPT) is the thing that's degraded.
export const ANTHROPIC_COMPONENT_MATCHERS = ["api.anthropic.com"]; // "Claude API (api.anthropic.com)"
export const OPENAI_COMPONENT_MATCHERS = ["audio"]; // "Audio" - the /v1/audio/transcriptions surface
