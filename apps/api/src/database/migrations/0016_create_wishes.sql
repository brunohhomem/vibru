CREATE TYPE "public"."wish_category" AS ENUM('movie', 'music', 'travel', 'together', 'date_idea', 'other');--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "wish_category" NOT NULL,
	"url" text,
	"image_url" text,
	"price_cents" integer,
	"notes" text,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "wish_id" uuid;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishes_couple_id_idx" ON "wishes" USING btree ("couple_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_wish_id_idx" ON "events" USING btree ("wish_id");