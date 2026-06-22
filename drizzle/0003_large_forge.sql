ALTER TABLE `cms_content` ADD `draftContent` text;--> statement-breakpoint
ALTER TABLE `cms_content` ADD `hasDraft` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cms_faq` ADD `draftQuestion` text;--> statement-breakpoint
ALTER TABLE `cms_faq` ADD `draftAnswer` text;--> statement-breakpoint
ALTER TABLE `cms_faq` ADD `hasDraft` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cms_styles` ADD `draftValue` varchar(512);--> statement-breakpoint
ALTER TABLE `cms_styles` ADD `hasDraft` boolean DEFAULT false NOT NULL;