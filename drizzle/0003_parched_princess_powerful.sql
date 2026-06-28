ALTER TYPE "public"."session_status" ADD VALUE 'synthesizing';--> statement-breakpoint
ALTER TYPE "public"."session_status" ADD VALUE 'failed';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "chapter_count" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "synthesis_started_at" timestamp with time zone;