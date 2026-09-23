CREATE SCHEMA "locker";
--> statement-breakpoint
CREATE TYPE "locker"."card_type" AS ENUM('id_doc', 'bank', 'insurance', 'vehicle', 'property', 'medical', 'education', 'contact', 'note');--> statement-breakpoint
CREATE TYPE "locker"."link_kind" AS ENUM('image', 'pdf', 'doc', 'folder');--> statement-breakpoint
CREATE TYPE "locker"."link_source" AS ENUM('drive', 'digilocker', 'other');--> statement-breakpoint
CREATE TYPE "locker"."recurrence" AS ENUM('none', 'yearly', 'monthly');--> statement-breakpoint
CREATE TYPE "locker"."reminder_status" AS ENUM('pending', 'done', 'snoozed');--> statement-breakpoint
CREATE TABLE "locker"."cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "locker"."card_type" NOT NULL,
	"title" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locker"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locker"."fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"iv" text,
	"salt" text,
	"masked" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locker"."fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locker"."links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"source" "locker"."link_source" DEFAULT 'other' NOT NULL,
	"drive_file_id" text,
	"kind" "locker"."link_kind" DEFAULT 'doc' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locker"."links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locker"."push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "locker"."push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "locker"."reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"field_key" text,
	"due_date" date NOT NULL,
	"recurrence" "locker"."recurrence" DEFAULT 'none' NOT NULL,
	"lead_days" jsonb DEFAULT '[30,7,1]'::jsonb NOT NULL,
	"status" "locker"."reminder_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locker"."reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "locker"."fields" ADD CONSTRAINT "fields_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "locker"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locker"."links" ADD CONSTRAINT "links_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "locker"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locker"."reminders" ADD CONSTRAINT "reminders_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "locker"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_user_id_idx" ON "locker"."cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fields_card_id_idx" ON "locker"."fields" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "links_card_id_idx" ON "locker"."links" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "locker"."push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminders_card_id_idx" ON "locker"."reminders" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "reminders_due_date_idx" ON "locker"."reminders" USING btree ("due_date");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "locker"."cards" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "locker"."cards"."user_id") WITH CHECK ((select auth.uid()) = "locker"."cards"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "locker"."fields" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "locker"."fields"."user_id") WITH CHECK ((select auth.uid()) = "locker"."fields"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "locker"."links" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "locker"."links"."user_id") WITH CHECK ((select auth.uid()) = "locker"."links"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "locker"."push_subscriptions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "locker"."push_subscriptions"."user_id") WITH CHECK ((select auth.uid()) = "locker"."push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "locker"."reminders" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "locker"."reminders"."user_id") WITH CHECK ((select auth.uid()) = "locker"."reminders"."user_id");