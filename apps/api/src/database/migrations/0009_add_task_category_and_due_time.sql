CREATE TYPE "public"."task_category" AS ENUM('home', 'health', 'shopping', 'bills', 'other');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "due_time" time;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" "task_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_due_time_check" CHECK ("tasks"."due_time" IS NULL OR "tasks"."due_on" IS NOT NULL);