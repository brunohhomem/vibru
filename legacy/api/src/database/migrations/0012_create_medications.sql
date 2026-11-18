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
ALTER TABLE "medications" ADD CONSTRAINT "medications_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_member_id_couple_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."couple_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medications_couple_id_idx" ON "medications" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "medications_member_id_idx" ON "medications" USING btree ("member_id");