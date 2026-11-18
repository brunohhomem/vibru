CREATE TYPE "public"."wish_category" AS ENUM('movie', 'music', 'travel', 'together', 'date_idea', 'other');--> statement-breakpoint
CREATE TYPE "public"."gift_category" AS ENUM('clothing', 'accessory', 'other');--> statement-breakpoint
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
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "gift_category" NOT NULL,
	"url" text,
	"image_url" text,
	"price_cents" integer,
	"notes" text,
	"reserved_by_member_id" uuid,
	"reserved_at" timestamp with time zone,
	"received_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"starts_on" date NOT NULL,
	"start_time" time,
	"notes" text,
	"wish_id" uuid
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
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_owner_member_id_couple_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_reserved_by_member_id_couple_members_id_fk" FOREIGN KEY ("reserved_by_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishes_couple_id_idx" ON "wishes" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "gifts_couple_id_owner_member_id_idx" ON "gifts" USING btree ("couple_id","owner_member_id");--> statement-breakpoint
CREATE INDEX "events_couple_id_starts_on_idx" ON "events" USING btree ("couple_id","starts_on");--> statement-breakpoint
CREATE INDEX "events_wish_id_idx" ON "events" USING btree ("wish_id");--> statement-breakpoint
CREATE INDEX "important_dates_couple_id_idx" ON "important_dates" USING btree ("couple_id");