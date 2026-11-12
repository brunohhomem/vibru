CREATE TYPE "public"."gift_category" AS ENUM('clothing', 'accessory', 'other');--> statement-breakpoint
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
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_owner_member_id_couple_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_reserved_by_member_id_couple_members_id_fk" FOREIGN KEY ("reserved_by_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gifts_couple_id_owner_member_id_idx" ON "gifts" USING btree ("couple_id","owner_member_id");