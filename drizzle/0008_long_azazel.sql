CREATE TABLE `ai_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'gemini',
	`apiBaseUrl` varchar(255) NOT NULL DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai',
	`apiKey` text,
	`genModel` varchar(96) NOT NULL DEFAULT 'gemini-2.5-flash',
	`humanizerModel` varchar(96) NOT NULL DEFAULT 'gemini-2.5-flash',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_settings_id` PRIMARY KEY(`id`)
);
