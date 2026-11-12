CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"starts_on" date NOT NULL,
	"start_time" time,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "important_dates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"occurs_on" date NOT NULL,
	"repeats_yearly" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "couple_members" ADD COLUMN "ics_token_hash" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_couple_id_starts_on_idx" ON "events" USING btree ("couple_id","starts_on");--> statement-breakpoint
CREATE INDEX "important_dates_couple_id_idx" ON "important_dates" USING btree ("couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_ics_token_hash_idx" ON "couple_members" USING btree ("ics_token_hash");