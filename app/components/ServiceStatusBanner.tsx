"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ProviderHealth, ProviderKey } from "@/lib/status/types";

type ServiceStatus = Record<ProviderKey, ProviderHealth>;

// Claude writes the interview questions and the book; OpenAI transcribes spoken answers. One calm,
// plain line per affected provider - names the situation, reassures, points at the next step.
const PROVIDER_NOTICE: Record<ProviderKey, string> = {
  anthropic:
    "כתיבת השאלות והספר יכולה להיות איטית או להיתקע כרגע. מה שכתבת נשמר - אפשר לנסות שוב עוד מעט.",
  openai: "התמלול הקולי לא יציב כרגע. אפשר להקליד את התשובות בינתיים.",
};

const POLL_INTERVAL_MS = 60_000;
const DISMISS_KEY = "soothly:status-dismissed";
const PROVIDERS: readonly ProviderKey[] = ["anthropic", "openai"];
const HEALTHS: readonly ProviderHealth[] = ["operational", "degraded", "down"];

type Notice = { key: ProviderKey; health: ProviderHealth; text: string };

// Validate the /api/status response at the boundary; a malformed body yields null (leave the banner
// untouched) rather than a notice with undefined health.
function parseStatus(json: unknown): ServiceStatus | null {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  const isHealth = (v: unknown): v is ProviderHealth => HEALTHS.includes(v as ProviderHealth);
  if (!isHealth(record.anthropic) || !isHealth(record.openai)) return null;
  return { anthropic: record.anthropic, openai: record.openai };
}

function noticesFrom(status: ServiceStatus): Notice[] {
  return PROVIDERS.filter((key) => status[key] !== "operational").map((key) => ({
    key,
    health: status[key],
    text: PROVIDER_NOTICE[key],
  }));
}

// Re-show a dismissed banner when the situation changes (a provider escalates or a new one is hit).
function signatureOf(notices: Notice[]): string {
  return notices.map((n) => `${n.key}:${n.health}`).join(",");
}

export default function ServiceStatusBanner() {
  const pathname = usePathname();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;
      const status = parseStatus(await res.json());
      if (status) setNotices(noticesFrom(status));
    } catch {
      // A failed status poll is non-critical: leave the banner as-is rather than raise a false
      // alarm. The server already logs the underlying provider-feed error.
    }
  }, []);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY));
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Claude affects every text surface (interview questions + the book), so its notice is global.
  // OpenAI only powers voice transcription, which lives on the interview - don't advise "type your
  // answers instead" on pages that have no answers to type.
  const visible = notices.filter(
    (n) => n.key !== "openai" || pathname?.startsWith("/interview"),
  );
  const signature = signatureOf(visible);
  if (visible.length === 0 || signature === dismissed) return null;

  const onDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, signature);
    setDismissed(signature);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="paper-content border-b border-gold-line bg-[rgba(168,124,79,0.1)]"
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3 px-5 py-3">
        <div className="flex-1 space-y-1.5">
          {visible.map((n) => (
            <p
              key={n.key}
              className="flex gap-2 font-sans text-sm leading-relaxed text-ink-soft"
            >
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
              <span>{n.text}</span>
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="סגירה"
          className="-me-1 shrink-0 rounded-full px-2 py-0.5 text-lg leading-none text-muted hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}
