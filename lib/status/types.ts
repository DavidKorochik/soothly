import { z } from "zod";

export type ProviderKey = "anthropic" | "openai";

// Our three-level health scale, collapsed from Statuspage's finer-grained component statuses.
export type ProviderHealth = "operational" | "degraded" | "down";

export type ServiceStatus = {
  anthropic: ProviderHealth;
  openai: ProviderHealth;
  checkedAt: string;
};

const ComponentSchema = z.object({ name: z.string(), status: z.string() });

// We validate only the components slice; every other field is ignored. Each component is parsed
// leniently and malformed entries are dropped, so one unexpected component in the feed can't fail
// the whole read closed to "operational".
export const StatuspageSummarySchema = z.object({
  components: z
    .array(z.unknown())
    .default([])
    .transform((items) =>
      items.flatMap((item) => {
        const parsed = ComponentSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
});
