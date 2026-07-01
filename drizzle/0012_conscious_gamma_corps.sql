ALTER TABLE `service_sessions` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `service_sessions` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `service_sessions` ADD `mailSent` boolean DEFAULT false NOT NULL;