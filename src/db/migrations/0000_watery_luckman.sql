CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`text` text NOT NULL,
	`embedding` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fields` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`sensitive` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`path` text NOT NULL,
	`mime` text NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`content_hash` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`due_date` text NOT NULL,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`lead_days` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vault` (
	`id` text PRIMARY KEY NOT NULL,
	`field_id` text NOT NULL,
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`auth_tag` text NOT NULL,
	`masked` text NOT NULL,
	FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vault_field_id_unique` ON `vault` (`field_id`);