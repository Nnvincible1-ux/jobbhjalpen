CREATE TABLE `cms_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textKey` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`defaultContent` text NOT NULL,
	`label` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`isDraft` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_faq` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isDraft` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_faq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminName` varchar(255),
	`entityType` enum('text','style','faq','publish') NOT NULL,
	`entityKey` varchar(255),
	`beforeValue` text,
	`afterValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cms_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_styles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`styleKey` varchar(255) NOT NULL,
	`value` varchar(512) NOT NULL,
	`defaultValue` varchar(512) NOT NULL,
	`label` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'colors',
	`cssVar` varchar(128),
	`inputType` varchar(32) NOT NULL DEFAULT 'color',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isDraft` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_styles_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_styles_styleKey_unique` UNIQUE(`styleKey`)
);
--> statement-breakpoint
CREATE TABLE `service_sessions` (
	`id` varchar(40) NOT NULL,
	`serviceSlug` varchar(64) NOT NULL,
	`userId` int,
	`paymentStatus` enum('unpaid','paid') NOT NULL DEFAULT 'unpaid',
	`stripeSessionId` varchar(255),
	`status` enum('created','ready','processing','completed','locked') NOT NULL DEFAULT 'created',
	`inputFileKey` varchar(512),
	`inputFileName` varchar(512),
	`inputText` text,
	`annonsText` text,
	`remainingRounds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`category` enum('job','private') NOT NULL,
	`priceSek` int NOT NULL DEFAULT 49,
	`promptKey` varchar(64) NOT NULL,
	`hasAdjustments` boolean NOT NULL DEFAULT false,
	`maxRounds` int NOT NULL DEFAULT 0,
	`acceptsAnnons` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `session_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(40) NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_messages_id` PRIMARY KEY(`id`)
);
