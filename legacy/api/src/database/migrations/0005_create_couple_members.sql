CREATE TYPE "public"."member_color" AS ENUM('blue', 'purple');--> statement-breakpoint
CREATE TABLE "couple_members" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"color" "member_color" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "couple_members_couple_id_idx" ON "couple_members" USING btree ("couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_user_id_idx" ON "couple_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_couple_id_color_idx" ON "couple_members" USING btree ("couple_id","color");