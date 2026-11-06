CREATE TYPE "public"."health_event_kind" AS ENUM('appointment', 'exam', 'vaccine', 'surgery', 'hospitalization');--> statement-breakpoint
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
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_events_couple_id_idx" ON "health_events" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "health_events_member_id_occurred_on_idx" ON "health_events" USING btree ("member_id","occurred_on");