CREATE TYPE "public"."task_category" AS ENUM('home', 'health', 'shopping', 'bills', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_recurrence" AS ENUM('none', 'daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"assignee_member_id" uuid,
	"due_on" date,
	"due_time" time,
	"category" "task_category" DEFAULT 'other' NOT NULL,
	"medication_id" uuid,
	"recurrence_kind" "task_recurrence" DEFAULT 'none' NOT NULL,
	"recurrence_interval" integer DEFAULT 1 NOT NULL,
	"recurrence_anchor_on" date,
	"completed_at" timestamp with time zone,
	"completed_by_member_id" uuid,
	"generated_from_task_id" uuid,
	CONSTRAINT "tasks_due_time_check" CHECK ("tasks"."due_time" IS NULL OR "tasks"."due_on" IS NOT NULL),
	CONSTRAINT "tasks_recurrence_check" CHECK ("tasks"."recurrence_kind" = 'none' OR ("tasks"."due_on" IS NOT NULL AND "tasks"."recurrence_anchor_on" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"title" text NOT NULL,
	"checked_at" timestamp with time zone,
	"checked_by_member_id" uuid
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_member_id_couple_members_id_fk" FOREIGN KEY ("assignee_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_member_id_couple_members_id_fk" FOREIGN KEY ("completed_by_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_generated_from_task_id_tasks_id_fk" FOREIGN KEY ("generated_from_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_checked_by_member_id_couple_members_id_fk" FOREIGN KEY ("checked_by_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_couple_id_completed_at_idx" ON "tasks" USING btree ("couple_id","completed_at");--> statement-breakpoint
CREATE INDEX "tasks_couple_id_due_on_idx" ON "tasks" USING btree ("couple_id","due_on");--> statement-breakpoint
CREATE INDEX "tasks_medication_id_idx" ON "tasks" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "tasks_generated_from_task_id_idx" ON "tasks" USING btree ("generated_from_task_id");--> statement-breakpoint
CREATE INDEX "list_items_couple_id_idx" ON "list_items" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "list_items_list_id_checked_at_idx" ON "list_items" USING btree ("list_id","checked_at");--> statement-breakpoint
CREATE INDEX "lists_couple_id_updated_at_idx" ON "lists" USING btree ("couple_id","updated_at");