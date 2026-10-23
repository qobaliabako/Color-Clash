CREATE TABLE `deleted_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`deleted_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deleted_sessions_client_id_unique` ON `deleted_sessions` (`client_id`);--> statement-breakpoint
CREATE TABLE `exclusion_history` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`excluded` integer NOT NULL,
	`reason` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_analysis` (
	`session_id` text PRIMARY KEY NOT NULL,
	`excluded` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
