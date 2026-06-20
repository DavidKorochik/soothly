import {
  ANTHROPIC_COMPONENT_MATCHERS,
  ANTHROPIC_STATUS_URL,
  OPENAI_COMPONENT_MATCHERS,
  OPENAI_STATUS_URL,
  STATUS_REVALIDATE_SECONDS,
  STATUS_TIMEOUT_MS,
} from "./constants";
import { deriveHealth } from "./health";
import { StatuspageSummarySchema } from "./types";
import type { ProviderHealth, ServiceStatus } from "./types";

// Fetch one provider's Statuspage feed and reduce its relevant components to a single health level.
async function fetchProviderHealth(
  url: string,
  matchers: readonly string[],
): Promise<ProviderHealth> {
  const res = await fetch(url, {
    next: { revalidate: STATUS_REVALIDATE_SECONDS },
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`status feed ${url} returned ${res.status}`);

  const parsed = StatuspageSummarySchema.safeParse(await res.json());
  if (!parsed.success) throw new Error(`status feed ${url} failed validation`);

  const { health, matchedCount } = deriveHealth(parsed.data.components, matchers);
  // Zero matches reads as operational (no false alarm), but it also means the monitor has gone
  // blind - usually because the vendor renamed the component. Surface it instead of going dark.
  if (matchedCount === 0) {
    console.warn(`status: no components matched [${matchers.join(", ")}] at ${url} - matcher may be stale`);
  }
  return health;
}

// Fail-safe wrapper: any network, timeout, parse, or validation error reads as "operational" so an
// outage of the status feed itself never raises a false alarm in the product. The failure is logged.
async function safeProviderHealth(
  provider: string,
  url: string,
  matchers: readonly string[],
): Promise<ProviderHealth> {
  try {
    return await fetchProviderHealth(url, matchers);
  } catch (error) {
    console.error(`status check for ${provider} failed - treating as operational`, error);
    return "operational";
  }
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const [anthropic, openai] = await Promise.all([
    safeProviderHealth("anthropic", ANTHROPIC_STATUS_URL, ANTHROPIC_COMPONENT_MATCHERS),
    safeProviderHealth("openai", OPENAI_STATUS_URL, OPENAI_COMPONENT_MATCHERS),
  ]);
  return { anthropic, openai, checkedAt: new Date().toISOString() };
}
