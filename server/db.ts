import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  cmsContent,
  cmsFaq,
  cmsRevisions,
  cmsStyles,
  InsertParticipant,
  InsertServiceSession,
  InsertUser,
  aiSettings,
  siteSettings,
  articles,
  memberships,
  participants,
  subscriptions,
  serviceSessions,
  sessionMessages,
  services,
  tenants,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* ----------------------------- Users (auth) ----------------------------- */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/* ------------------------------- Tenants -------------------------------- */

export async function listTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants);
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return rows[0];
}

export async function createTenant(input: { slug: string; name: string; logoText?: string; colorPrimary?: string; colorAccent?: string; tagline?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(tenants).values({ ...input, type: "coach" });
}

export async function getMembership(userId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId))).limit(1);
  return rows[0];
}

export async function addMembership(userId: number, tenantId: number, orgRole: "org_admin" | "coach") {
  const db = await getDb();
  if (!db) return;
  await db.insert(memberships).values({ userId, tenantId, orgRole });
}

export async function listMembershipsForTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberships).where(eq(memberships.tenantId, tenantId));
}

/** All tenants a user belongs to, with org role and tenant name/slug. */
export async function listUserOrgs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      tenantId: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      orgRole: memberships.orgRole,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId));
  return rows;
}

/* ------------------------------ Billing --------------------------------- */

export async function getSubscription(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  return rows[0];
}

export async function upsertSubscription(tenantId: number, patch: { plan?: "per_coach" | "per_participant" | "platform"; seats?: number; status?: "trial" | "active" | "past_due" | "canceled"; stripeCustomerId?: string; stripeSubscriptionId?: string }) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSubscription(tenantId);
  if (existing) {
    await db.update(subscriptions).set(patch).where(eq(subscriptions.tenantId, tenantId));
  } else {
    await db.insert(subscriptions).values({ tenantId, ...patch });
  }
}

/* ------------------------------ Participants ---------------------------- */

export async function createParticipant(input: { tenantId: number; coachUserId: number; fullName: string; email?: string; note?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(participants).values(input);
}

export async function listParticipants(tenantId: number, coachUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (coachUserId !== undefined) {
    return db.select().from(participants).where(and(eq(participants.tenantId, tenantId), eq(participants.coachUserId, coachUserId))).orderBy(asc(participants.createdAt));
  }
  return db.select().from(participants).where(eq(participants.tenantId, tenantId)).orderBy(asc(participants.createdAt));
}

export async function getParticipant(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
  return rows[0];
}

export async function updateParticipant(id: number, patch: Partial<InsertParticipant>) {
  const db = await getDb();
  if (!db) return;
  await db.update(participants).set(patch).where(eq(participants.id, id));
}

/* ------------------------------- Services ------------------------------- */

export async function listServices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder));
}

export async function getServiceBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/* ----------------------------- Site settings (tracking) ----------------- */

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(siteSettings).limit(1);
  return rows[0];
}

export async function updateSiteSettings(patch: Partial<typeof siteSettings.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSiteSettings();
  if (existing) {
    await db.update(siteSettings).set(patch).where(eq(siteSettings.id, existing.id));
  } else {
    await db.insert(siteSettings).values(patch as typeof siteSettings.$inferInsert);
  }
}

/* ----------------------------- AI settings ------------------------------ */

export async function getAiSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(aiSettings).limit(1);
  return rows[0];
}

export async function updateAiSettings(patch: Partial<typeof aiSettings.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAiSettings();
  if (existing) {
    await db.update(aiSettings).set(patch).where(eq(aiSettings.id, existing.id));
  } else {
    await db.insert(aiSettings).values(patch as typeof aiSettings.$inferInsert);
  }
}

/* ------------------------------- Articles ------------------------------- */

export async function listArticles(includeDrafts: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (includeDrafts) return db.select().from(articles).orderBy(asc(articles.sortOrder));
  return db.select().from(articles).where(eq(articles.isDraft, false)).orderBy(asc(articles.sortOrder));
}

export async function getArticleBySlug(slug: string, includeDrafts: boolean) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  const a = rows[0];
  if (!a) return undefined;
  if (a.isDraft && !includeDrafts) return undefined;
  return a;
}

export async function updateArticle(slug: string, patch: Partial<typeof articles.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set(patch).where(eq(articles.slug, slug));
}

/* --------------------------------- CMS ---------------------------------- */

// Public reads return published columns. Preview overlays draft values when present.
export async function getCmsTexts(includeDrafts: boolean) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(cmsContent);
  return rows.map((r) => ({
    ...r,
    content: includeDrafts && r.hasDraft && r.draftContent !== null ? r.draftContent : r.content,
  }));
}

export async function getCmsStyles(includeDrafts: boolean) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(cmsStyles).orderBy(asc(cmsStyles.sortOrder));
  return rows.map((r) => ({
    ...r,
    value: includeDrafts && r.hasDraft && r.draftValue !== null ? r.draftValue : r.value,
  }));
}

export async function getCmsFaq(includeDrafts: boolean) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(cmsFaq).orderBy(asc(cmsFaq.sortOrder));
  return rows.map((r) => ({
    ...r,
    question: includeDrafts && r.hasDraft && r.draftQuestion !== null ? r.draftQuestion : r.question,
    answer: includeDrafts && r.hasDraft && r.draftAnswer !== null ? r.draftAnswer : r.answer,
  }));
}

// Edits are stored in draft columns; published columns stay intact until publish.
export async function updateCmsText(textKey: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(cmsContent).set({ draftContent: content, hasDraft: true }).where(eq(cmsContent.textKey, textKey));
}

export async function updateCmsStyle(styleKey: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(cmsStyles).set({ draftValue: value, hasDraft: true }).where(eq(cmsStyles.styleKey, styleKey));
}

export async function upsertFaq(input: { id?: number; question: string; answer: string; sortOrder: number }) {
  const db = await getDb();
  if (!db) return;
  if (input.id) {
    // store as draft
    await db.update(cmsFaq).set({ draftQuestion: input.question, draftAnswer: input.answer, sortOrder: input.sortOrder, hasDraft: true }).where(eq(cmsFaq.id, input.id));
  } else {
    // new FAQ is created already published (nothing to hide) but flagged so it shows as fresh
    await db.insert(cmsFaq).values({ question: input.question, answer: input.answer, sortOrder: input.sortOrder });
  }
}

export async function deleteFaq(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cmsFaq).where(eq(cmsFaq.id, id));
}

/** Publish: copy draft values into published columns, then clear drafts. */
export async function publishAllDrafts(adminName: string | null) {
  const db = await getDb();
  if (!db) return;

  const draftTexts = await db.select().from(cmsContent).where(eq(cmsContent.hasDraft, true));
  for (const t of draftTexts) {
    if (t.draftContent !== null) {
      await db.update(cmsContent).set({ content: t.draftContent, draftContent: null, hasDraft: false }).where(eq(cmsContent.id, t.id));
    }
  }
  const draftStyles = await db.select().from(cmsStyles).where(eq(cmsStyles.hasDraft, true));
  for (const s of draftStyles) {
    if (s.draftValue !== null) {
      await db.update(cmsStyles).set({ value: s.draftValue, draftValue: null, hasDraft: false }).where(eq(cmsStyles.id, s.id));
    }
  }
  const draftFaq = await db.select().from(cmsFaq).where(eq(cmsFaq.hasDraft, true));
  for (const f of draftFaq) {
    await db.update(cmsFaq).set({
      question: f.draftQuestion ?? f.question,
      answer: f.draftAnswer ?? f.answer,
      draftQuestion: null,
      draftAnswer: null,
      hasDraft: false,
    }).where(eq(cmsFaq.id, f.id));
  }

  await db.insert(cmsRevisions).values({ adminName, entityType: "publish", entityKey: "all", afterValue: "published" });
}

/* ------------------------------ Sessions -------------------------------- */

export async function createSession(input: InsertServiceSession) {
  const db = await getDb();
  if (!db) return;
  await db.insert(serviceSessions).values(input);
}

export async function getSession(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceSessions).where(eq(serviceSessions.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function updateSession(id: string, patch: Partial<InsertServiceSession>) {
  const db = await getDb();
  if (!db) return;
  await db.update(serviceSessions).set(patch).where(eq(serviceSessions.id, id));
}

export async function markSessionPaid(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(serviceSessions)
    .set({ paymentStatus: "paid" })
    .where(eq(serviceSessions.stripeSessionId, stripeSessionId));
}

export async function getSessionByStripeId(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceSessions).where(eq(serviceSessions.stripeSessionId, stripeSessionId)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function addMessage(sessionId: string, role: "user" | "assistant", content: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(sessionMessages).values({ sessionId, role, content });
}

export async function getMessages(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sessionMessages).where(eq(sessionMessages.sessionId, sessionId)).orderBy(asc(sessionMessages.createdAt));
}
