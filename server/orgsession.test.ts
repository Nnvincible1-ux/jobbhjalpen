import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./ai/engine", () => ({
  runService: vi.fn(async () => "MOCK"),
  adjustService: vi.fn(async () => "MOCK"),
}));

const created: any[] = [];

vi.mock("./db", () => ({
  getMembership: vi.fn(async (userId: number, tenantId: number) =>
    userId === 10 && tenantId === 1 ? { orgRole: "coach" } : undefined
  ),
  getParticipant: vi.fn(async (id: number) => ({ id, tenantId: 1, coachUserId: 10, fullName: "Anna", status: "active" })),
  getServiceBySlug: vi.fn(async (slug: string) => ({ slug, promptKey: "cv_granskning", hasAdjustments: true, maxRounds: 3, priceSek: 49 })),
  createSession: vi.fn(async (s: any) => { created.push(s); }),
  // imported-but-unused
  addMembership: vi.fn(), addMessage: vi.fn(), createParticipant: vi.fn(), deleteFaq: vi.fn(),
  getCmsFaq: vi.fn(async () => []), getCmsStyles: vi.fn(async () => []), getCmsTexts: vi.fn(async () => []),
  getMessages: vi.fn(async () => []), getSession: vi.fn(), getSubscription: vi.fn(async () => null),
  getTenantById: vi.fn(async () => ({ id: 1, name: "Karriärlyftet" })), getUserByOpenId: vi.fn(),
  listParticipants: vi.fn(async () => []), listServices: vi.fn(async () => []), listTenants: vi.fn(async () => []),
  listUserOrgs: vi.fn(async () => [{ tenantId: 1, name: "Karriärlyftet", slug: "k", orgRole: "coach" }]),
  publishAllDrafts: vi.fn(), updateCmsStyle: vi.fn(), updateCmsText: vi.fn(),
  updateParticipant: vi.fn(), updateSession: vi.fn(), upsertFaq: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctx(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: "o", email: null, name: "Coach", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("org-context session creation", () => {
  beforeEach(() => { created.length = 0; });

  it("creates a paid session carrying tenant, participant and coach ids", async () => {
    const caller = appRouter.createCaller(ctx(10));
    const r = await caller.coach.startServiceForParticipant({
      tenantId: 1,
      participantId: 5,
      serviceSlug: "cv-granskning",
      documentText: "Anna Andersson, systemutvecklare med lång erfarenhet av Java.",
    });
    expect(r.ok).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      paymentStatus: "paid",
      tenantId: 1,
      participantId: 5,
      coachUserId: 10,
    });
  });
});
