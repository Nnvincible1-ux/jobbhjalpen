CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int NOT NULL,
	`orgRole` enum('org_admin','coach') NOT NULL DEFAULT 'coach',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`coachUserId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320),
	`note` text,
	`status` enum('active','placed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('consumer','coach') NOT NULL DEFAULT 'coach',
	`logoText` varchar(64),
	`colorPrimary` varchar(32),
	`colorAccent` varchar(32),
	`tagline` varchar(512),
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `service_sessions` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `service_sessions` ADD `participantId` int;--> statement-breakpoint
ALTER TABLE `service_sessions` ADD `coachUserId` int;