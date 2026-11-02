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
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_checked_by_member_id_couple_members_id_fk" FOREIGN KEY ("checked_by_member_id") REFERENCES "public"."couple_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_items_couple_id_idx" ON "list_items" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "list_items_list_id_checked_at_idx" ON "list_items" USING btree ("list_id","checked_at");