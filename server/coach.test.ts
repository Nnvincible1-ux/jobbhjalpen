import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./ai/engine", () => ({
  runService: vi.fn(async () => "MOCK"),
  adjustService: vi.fn(async () => "MOCK"),
}));

// memberships: user 10 belongs to tenant 1 (coach). user 20 has no membership.
const memberships = new Map<string, { orgRole: "org_admin" | "coach" }>([
  ["10:1", { orgRole: "coach" }],
]);
const participants: any[] = [
  { id: 1, tenantId: 1, coachUserId: 10, fullName: "Anna", status: "active" },
  { id: 2, tenantId: 1, coachUserId: 99, fullName: "Bertil", status: "active" },
];

vi.mock("./db", () => ({
  getMembership: vi.fn(async (userId: number, tenantId: number) => memberships.get(`${userId}:${tenantId}`)),
  listParticipants: vi.fn(async (tenantId: number, coachUserId?: number) =>
    participants.filter((p) => p.tenantId === tenantId && (coachUserId === undefined || p.coachUserId === coachUserId))
  ),
  createParticipant: vi.fn(async () => {}),
  getParticipant: vi.fn(async (id: number) => participants.find((p) => p.id === id)),
  updateParticipant: vi.fn(async () => {}),
  getSubscription: vi.fn(async () => ({ plan: "per_coach", status: "trial", seats: 5 })),
  getTenantById: vi.fn(async () => ({ id: 1, name: "Karriärlyftet" })),
  listTenants: vi.fn(async () => [{ id: 1, name: "Karriärlyftet", slug: "karriarlyftet", type: "coach" }]),
  // unused-but-imported helpers
  addMessage: vi.fn(), deleteFaq: vi.fn(), getCmsFaq: vi.fn(async () => []),
  getCmsStyles: vi.fn(async () => []), getCmsTexts: vi.fn(async () => []),
  getMessages: vi.fn(async () => []), getServiceBySlug: vi.fn(), getSession: vi.fn(),
  listServices: vi.fn(async () => []), publishAllDrafts: vi.fn(),
  updateCmsStyle: vi.fn(), updateCmsText: vi.fn(), updateSession: vi.fn(), upsertFaq: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(userId: number, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id: userId, openId: "o", email: null, name: "U", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("coach tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a coach list only their own participants in their tenant", async () => {
    const caller = appRouter.createCaller(ctxFor(10));
    const list = await caller.coach.listParticipants({ tenantId: 1 });
    expect(list.map((p) => p.fullName)).toEqual(["Anna"]); // not Bertil (other coach)
  });

  it("blocks a user with no membership from another tenant's data", async () => {
    const caller = appRouter.createCaller(ctxFor(20));
    await expect(caller.coach.listParticipants({ tenantId: 1 })).rejects.toThrow(/behörighet/);
  });

  it("lets platform admin see all participants in a tenant", async () => {
    const caller = appRouter.createCaller(ctxFor(1, "admin"));
    const list = await caller.coach.listParticipants({ tenantId: 1 });
    expect(list.length).toBe(2);
  });
});
