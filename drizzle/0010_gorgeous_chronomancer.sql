ALTER TABLE `service_sessions` ADD `nonsenseStrikes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `accessCode` varchar(64);