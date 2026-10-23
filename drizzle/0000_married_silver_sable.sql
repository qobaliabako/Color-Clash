CREATE TABLE `mode_counters` (
	`mode` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`mode` text NOT NULL,
	`ordinal` integer NOT NULL,
	`seed` integer NOT NULL,
	`version` text NOT NULL,
	`knowledge` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started` text NOT NULL,
	`updated` text NOT NULL,
	`metadata` text NOT NULL,
	`survey` text,
	`summary` text,
	`saved` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_client_id_unique` ON `sessions` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mode_ordinal_unique` ON `sessions` (`mode`,`ordinal`);--> statement-breakpoint
CREATE TABLE `trials` (
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`trial_id` text NOT NULL,
	`payload` text NOT NULL,
	`hash` text NOT NULL,
	PRIMARY KEY(`session_id`, `seq`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_trial_unique` ON `trials` (`session_id`,`trial_id`);