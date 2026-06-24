export type TranscriptionErrorCode =
  | "empty_audio"
  | "too_large"
  | "unsupported_format"
  | "no_provider_key"
  | "provider_failed";

const STATUS: Record<TranscriptionErrorCode, number> = {
  empty_audio: 422,
  too_large: 413,
  unsupported_format: 415,
  no_provider_key: 503,
  provider_failed: 502,
};

// User-facing Hebrew. Every state fails soft to typing — the message always offers that path.
const USER_MESSAGE: Record<TranscriptionErrorCode, string> = {
  empty_audio: "לא קלטנו קול. אפשר לנסות שוב או להקליד.",
  too_large: "ההקלטה ארוכה מדי לתמלול. אפשר להקליט קטע קצר יותר, או להקליד.",
  unsupported_format: "פורמט ההקלטה לא נתמך. אפשר להקליד את התשובה.",
  no_provider_key: "התמלול לא זמין כרגע. אפשר להקליד את התשובה.",
  provider_failed: "התמלול נכשל. אפשר לנסות שוב או להקליד.",
};

export class TranscriptionError extends Error {
  readonly code: TranscriptionErrorCode;
  readonly status: number;
  readonly userMessage: string;

  constructor(code: TranscriptionErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "TranscriptionError";
    this.code = code;
    this.status = STATUS[code];
    this.userMessage = USER_MESSAGE[code];
  }
}
