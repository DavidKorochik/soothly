import { pgTable, pgEnum, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["male", "female"]);

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "flagged", // safety check surfaced crisis signals — human review before any generation
  "synthesized",
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  gender: genderEnum("gender").notNull(),
  age: integer("age").notNull(),
  status: sessionStatusEnum("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per answered question — the raw material is sacred: synthesis and the
// future "living book" re-synthesis both depend on it being saved structured.
export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    phase: integer("phase").notNull(), // 1 = warmup, 2 = deep
    questionKey: text("question_key").notNull(),
    questionText: text("question_text").notNull(),
    answer: text("answer").notNull(),
    meta: jsonb("meta"), // eval scores / follow-ups — populated in the interview step
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transcripts_session_idx").on(t.sessionId)],
);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  feltLikeMe: integer("felt_like_me"), // 1–5: did it feel like you
  hardestLine: text("hardest_line"), // which line hit hardest
  feltGeneric: text("felt_generic"), // what felt generic / off
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }), // nullable: some events fire before a session exists
    event: text("event").notNull(),
    phase: integer("phase"),
    questionKey: text("question_key"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("funnel_events_session_idx").on(t.sessionId)],
);
