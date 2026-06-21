import type { ProviderHealth } from "./types";

// Statuspage component statuses mapped onto our scale. Anything unrecognized reads as operational
// so a new status string can never, on its own, raise a false alarm.
const COMPONENT_HEALTH: Record<string, ProviderHealth> = {
  operational: "operational",
  degraded_performance: "degraded",
  under_maintenance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
};

const HEALTH_RANK: Record<ProviderHealth, number> = { operational: 0, degraded: 1, down: 2 };

function worse(a: ProviderHealth, b: ProviderHealth): ProviderHealth {
  return HEALTH_RANK[b] > HEALTH_RANK[a] ? b : a;
}

// Reduce a feed's components to a single health level for the components our calls actually hit.
// Pure (no I/O, no value imports) so the matcher + mapping are unit-tested without the network.
// `matchedCount` lets the caller tell "all matched components healthy" from "matched nothing" (a
// stale matcher), which reads the same on our scale but means very different things.
export function deriveHealth(
  components: readonly { name: string; status: string }[],
  matchers: readonly string[],
): { health: ProviderHealth; matchedCount: number } {
  const matched = components.filter((c) =>
    matchers.some((m) => c.name.toLowerCase().includes(m)),
  );
  const health = matched.reduce<ProviderHealth>(
    (acc, c) => worse(acc, COMPONENT_HEALTH[c.status] ?? "operational"),
    "operational",
  );
  return { health, matchedCount: matched.length };
}
