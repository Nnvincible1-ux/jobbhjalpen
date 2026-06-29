import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Services catalog. Each row is a sellable AI micro-service (49 kr).
 * `promptKey` maps to a locked system prompt in server/ai/prompts.ts.
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  category: mysqlEnum("category", ["job", "private"]).notNull(),
  priceSek: int("priceSek").notNull().default(49),
  promptKey: varchar("promptKey", { length: 64 }).notNull(),
  hasAdjustments: boolean("hasAdjustments").default(false).notNull(),
  maxRounds: int("maxRounds").default(0).notNull(),
  acceptsAnnons: boolean("acceptsAnnons").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Text CMS — every user-facing string. Draft/publish via isDraft.
 * Frontend reads only isDraft=false unless ?preview=draft.
 */
export const cmsContent = mysqlTable("cms_content", {
  id: int("id").autoincrement().primaryKey(),
  textKey: varchar("textKey", { length: 255 }).notNull().unique(),
  content: text("content").notNull(), // published value (public site reads this)
  defaultContent: text("defaultContent").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("general"),
  draftContent: text("draftContent"), // unpublished edit; null when no pending draft
  hasDraft: boolean("hasDraft").default(false).notNull(),
  isDraft: boolean("isDraft").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CmsContent = typeof cmsContent.$inferSelect;

/**
 * Style editor — CSS custom properties editable from admin.
 */
export const cmsStyles = mysqlTable("cms_styles", {
  id: int("id").autoincrement().primaryKey(),
  styleKey: varchar("styleKey", { length: 255 }).notNull().unique(),
  value: varchar("value", { length: 512 }).notNull(),
  defaultValue: varchar("defaultValue", { length: 512 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("colors"),
  cssVar: varchar("cssVar", { length: 128 }),
  inputType: varchar("inputType", { length: 32 }).notNull().default("color"),
  sortOrder: int("sortOrder").notNull().default(0),
  draftValue: varchar("draftValue", { length: 512 }),
  hasDraft: boolean("hasDraft").default(false).notNull(),
  isDraft: boolean("isDraft").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CmsStyle = typeof cmsStyles.$inferSelect;

/**
 * FAQ entries — editable, draft/publish.
 */
export const cmsFaq = mysqlTable("cms_faq", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  draftQuestion: text("draftQuestion"),
  draftAnswer: text("draftAnswer"),
  hasDraft: boolean("hasDraft").default(false).notNull(),
  isDraft: boolean("isDraft").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CmsFaq = typeof cmsFaq.$inferSelect;

/**
 * Revision history — audit trail for content/publish actions.
 */
export const cmsRevisions = mysqlTable("cms_revisions", {
  id: int("id").autoincrement().primaryKey(),
  adminName: varchar("adminName", { length: 255 }),
  entityType: mysqlEnum("entityType", ["text", "style", "faq", "publish"]).notNull(),
  entityKey: varchar("entityKey", { length: 255 }),
  beforeValue: text("beforeValue"),
  afterValue: text("afterValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Service session — one purchase/run of a service.
 * paymentStatus gates everything: AI only runs when 'paid'.
 * remainingRounds persists adjustment-round state in DB (never client).
 */
export const serviceSessions = mysqlTable("service_sessions", {
  id: varchar("id", { length: 40 }).primaryKey(), // nanoid
  serviceSlug: varchar("serviceSlug", { length: 64 }).notNull(),
  userId: int("userId"),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid"]).default("unpaid").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  status: mysqlEnum("status", ["created", "ready", "processing", "completed", "locked"]).default("created").notNull(),
  inputFileKey: varchar("inputFileKey", { length: 512 }),
  inputFileName: varchar("inputFileName", { length: 512 }),
  inputText: text("inputText"), // extracted CV / document text
  annonsText: text("annonsText"), // optional job ad text
  remainingRounds: int("remainingRounds").default(0).notNull(),
  tenantId: int("tenantId"),
  participantId: int("participantId"),
  coachUserId: int("coachUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceSession = typeof serviceSessions.$inferSelect;
export type InsertServiceSession = typeof serviceSessions.$inferInsert;

/**
 * Messages within a session: initial result + adjustment exchanges.
 */
export const sessionMessages = mysqlTable("session_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 40 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SessionMessage = typeof sessionMessages.$inferSelect;

/* ----------------------------- Multi-tenant ----------------------------- */

/**
 * Tenants. The consumer site is the 'default' tenant. Coach companies get
 * their own tenant with white-label branding.
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["consumer", "coach"]).default("coach").notNull(),
  logoText: varchar("logoText", { length: 64 }),
  colorPrimary: varchar("colorPrimary", { length: 32 }),
  colorAccent: varchar("colorAccent", { length: 32 }),
  tagline: varchar("tagline", { length: 512 }),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/** Membership links a user to a tenant with an org role. */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId").notNull(),
  orgRole: mysqlEnum("orgRole", ["org_admin", "coach"]).default("coach").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Membership = typeof memberships.$inferSelect;

/** Participants are job seekers managed by a coach inside a tenant. */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  coachUserId: int("coachUserId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  note: text("note"),
  status: mysqlEnum("status", ["active", "placed", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * Organisation subscription. Coach tenants are billed per coach/participant or
 * a flat platform fee. The consumer 49 kr flow is independent of this.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  plan: mysqlEnum("plan", ["per_coach", "per_participant", "platform"]).default("per_coach").notNull(),
  seats: int("seats").default(1).notNull(),
  status: mysqlEnum("status", ["trial", "active", "past_due", "canceled"]).default("trial").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;

/**
 * SEO articles / guides (pillar + cluster). CMS-editable, draft/publish.
 * Public site reads published; body is Markdown.
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  kind: mysqlEnum("kind", ["pillar", "cluster"]).default("cluster").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  metaTitle: varchar("metaTitle", { length: 255 }).notNull(),
  metaDescription: varchar("metaDescription", { length: 320 }).notNull(),
  excerpt: varchar("excerpt", { length: 512 }).notNull(),
  body: text("body").notNull(),
  keyword: varchar("keyword", { length: 160 }).notNull(),
  answerBlock: text("answerBlock"),
  relatedSlugs: varchar("relatedSlugs", { length: 512 }),
  ctaServiceSlug: varchar("ctaServiceSlug", { length: 64 }),
  faqJson: text("faqJson"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isDraft: boolean("isDraft").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;


/**
 * AI provider settings, editable from the admin panel.
 * Lets the owner switch provider/model/key without code changes.
 * Single row (id=1).
 */
export const aiSettings = mysqlTable("ai_settings", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 32 }).default("gemini").notNull(),
  apiBaseUrl: varchar("apiBaseUrl", { length: 255 })
    .default("https://generativelanguage.googleapis.com/v1beta/openai")
    .notNull(),
  apiKey: text("apiKey"),
  genModel: varchar("genModel", { length: 96 }).default("gemini-2.5-flash").notNull(),
  humanizerModel: varchar("humanizerModel", { length: 96 }).default("gemini-2.5-flash").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiSettings = typeof aiSettings.$inferSelect;


/** Standalone admin accounts (email/password + TOTP 2FA) for VPS deployment. */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  totpSecret: varchar("totpSecret", { length: 255 }),
  totpEnabled: boolean("totpEnabled").default(false).notNull(),
  failedAttempts: int("failedAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;

/** Admin sessions (remember-me up to 30 days), token stored in httpOnly cookie. */
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Site-wide settings editable from admin (tracking pixels). Single row. */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  fbPixelId: varchar("fbPixelId", { length: 64 }),
  ga4Id: varchar("ga4Id", { length: 64 }),
  accessCode: varchar("accessCode", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SiteSettings = typeof siteSettings.$inferSelect;
