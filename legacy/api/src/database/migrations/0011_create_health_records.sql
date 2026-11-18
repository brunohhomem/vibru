CREATE TYPE "public"."allergy_severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TABLE "allergies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"substance" text NOT NULL,
	"reaction" text,
	"severity" "allergy_severity" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"specialty" text,
	"phone" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_conditions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"since_on" date,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allergies_couple_id_idx" ON "allergies" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "allergies_member_id_idx" ON "allergies" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "doctors_couple_id_idx" ON "doctors" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "doctors_member_id_idx" ON "doctors" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_couple_id_idx" ON "emergency_contacts" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_member_id_idx" ON "emergency_contacts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "health_conditions_couple_id_idx" ON "health_conditions" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "health_conditions_member_id_idx" ON "health_conditions" USING btree ("member_id");