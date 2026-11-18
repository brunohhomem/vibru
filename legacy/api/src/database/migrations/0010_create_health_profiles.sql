CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TABLE "health_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"blood_type" "blood_type" DEFAULT 'unknown' NOT NULL,
	"organ_donor" boolean,
	"health_plan_name" text,
	"health_plan_number" text,
	"preferred_hospital" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_profiles_couple_id_idx" ON "health_profiles" USING btree ("couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_profiles_member_id_idx" ON "health_profiles" USING btree ("member_id");