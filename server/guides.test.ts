import { describe, expect, it, vi } from "vitest";

vi.mock("./ai/engine", () => ({
  runService: vi.fn(async () => "MOCK"),
  adjustService: vi.fn(async () => "MOCK"),
}));

const rows = [
  { slug: "skriva-cv", kind: "pillar", title: "Skriva CV", isDraft: false },
  { slug: "hemlig", kind: "cluster", title: "Utkast", isDraft: true },
];

vi.mock("./db", () => ({
  listArticles: vi.fn(async (drafts: boolean) => (drafts ? rows : rows.filter((r) => !r.isDraft))),
  getArticleBySlug: vi.fn(async (slug: string, drafts: boolean) => {
    const a = rows.find((r) => r.slug === slug);
    if (!a) return undefined;
    if (a.isDraft && !drafts) return undefined;
    return a;
  }),
  // unused-but-imported
  addMessage: vi.fn(), addMembership: vi.fn(), createParticipant: vi.fn(), createSession: vi.fn(),
  deleteFaq: vi.fn(), getCmsFaq: vi.fn(async () => []), getCmsStyles: vi.fn(async () => []),
  getCmsTexts: vi.fn(async () => []), getMembership: vi.fn(), getMessages: vi.fn(async () => []),
  getParticipant: vi.fn(), getServiceBySlug: vi.fn(), getSession: vi.fn(), getSubscription: vi.fn(),
  getTenantById: vi.fn(), getUserByOpenId: vi.fn(), listParticipants: vi.fn(async () => []),
  listServices: vi.fn(async () => []), listTenants: vi.fn(async () => []), listUserOrgs: vi.fn(async () => []),
  publishAllDrafts: vi.fn(), updateCmsStyle: vi.fn(), updateCmsText: vi.fn(),
  updateParticipant: vi.fn(), updateSession: vi.fn(), upsertFaq: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("guides router", () => {
  it("lists only published guides publicly", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.guides.list(undefined);
    expect(list.map((g: any) => g.slug)).toEqual(["skriva-cv"]);
  });

  it("hides a draft guide from public get", async () => {
    const caller = appRouter.createCaller(ctx);
    const a = await caller.guides.get({ slug: "hemlig" });
    expect(a).toBeUndefined();
  });

  it("returns a published guide by slug", async () => {
    const caller = appRouter.createCaller(ctx);
    const a = await caller.guides.get({ slug: "skriva-cv" });
    expect(a?.title).toBe("Skriva CV");
  });
});
