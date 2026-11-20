CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"task_assigned" boolean DEFAULT true NOT NULL,
	"task_completed" boolean DEFAULT true NOT NULL,
	"daily_summary" boolean DEFAULT true NOT NULL,
	"tomorrow_preview" boolean DEFAULT true NOT NULL,
	"low_stock" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;