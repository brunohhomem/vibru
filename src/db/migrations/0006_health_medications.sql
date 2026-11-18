CREATE TYPE "public"."allergy_severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."health_event_kind" AS ENUM('appointment', 'exam', 'vaccine', 'surgery', 'hospitalization');--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"times" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_continuous" boolean DEFAULT true NOT NULL,
	"stock_units" integer,
	"units_per_dose" integer DEFAULT 1 NOT NULL,
	"low_stock_days" integer DEFAULT 7 NOT NULL,
	"low_stock_prompted_at" timestamp with time zone,
	CONSTRAINT "medications_stock_units_check" CHECK ("medications"."stock_units" IS NULL OR "medications"."stock_units" >= 0),
	CONSTRAINT "medications_units_per_dose_check" CHECK ("medications"."units_per_dose" >= 1)
);
--> statement-breakpoint
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
CREATE TABLE "health_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"kind" "health_event_kind" NOT NULL,
	"occurred_on" date NOT NULL,
	"title" text NOT NULL,
	"doctor_id" uuid,
	"notes" text
);
--> statement-breakpoint
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
ALTER TABLE "medications" ADD CONSTRAINT "medications_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medications_couple_id_idx" ON "medications" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "medications_member_id_idx" ON "medications" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "allergies_couple_id_idx" ON "allergies" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "allergies_member_id_idx" ON "allergies" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "doctors_couple_id_idx" ON "doctors" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "doctors_member_id_idx" ON "doctors" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_couple_id_idx" ON "emergency_contacts" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_member_id_idx" ON "emergency_contacts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "health_conditions_couple_id_idx" ON "health_conditions" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "health_conditions_member_id_idx" ON "health_conditions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "health_events_couple_id_idx" ON "health_events" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "health_events_member_id_occurred_on_idx" ON "health_events" USING btree ("member_id","occurred_on");--> statement-breakpoint
CREATE INDEX "health_profiles_couple_id_idx" ON "health_profiles" USING btree ("couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_profiles_member_id_idx" ON "health_profiles" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;