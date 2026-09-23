CREATE TYPE "public"."card_type" AS ENUM('id_doc', 'bank', 'insurance', 'vehicle', 'property', 'medical', 'education', 'contact', 'note');--> statement-breakpoint
CREATE TYPE "public"."link_kind" AS ENUM('image', 'pdf', 'doc', 'folder');--> statement-breakpoint
CREATE TYPE "public"."link_source" AS ENUM('drive', 'digilocker', 'other');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('none', 'yearly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'done', 'snoozed');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "card_type" NOT NULL,
	"title" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fields" (
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
ALTER TABLE "fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"source" "link_source" DEFAULT 'other' NOT NULL,
	"drive_file_id" text,
	"kind" "link_kind" DEFAULT 'doc' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
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
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"field_key" text,
	"due_date" date NOT NULL,
	"recurrence" "recurrence" DEFAULT 'none' NOT NULL,
	"lead_days" jsonb DEFAULT '[30,7,1]'::jsonb NOT NULL,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_user_id_idx" ON "cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fields_card_id_idx" ON "fields" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "links_card_id_idx" ON "links" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminders_card_id_idx" ON "reminders" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "reminders_due_date_idx" ON "reminders" USING btree ("due_date");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "cards" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "cards"."user_id") WITH CHECK ((select auth.uid()) = "cards"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "fields" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "fields"."user_id") WITH CHECK ((select auth.uid()) = "fields"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "links" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "links"."user_id") WITH CHECK ((select auth.uid()) = "links"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "push_subscriptions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id") WITH CHECK ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "owner_crud" ON "reminders" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "reminders"."user_id") WITH CHECK ((select auth.uid()) = "reminders"."user_id");