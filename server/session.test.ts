import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the AI engine so tests never call the LLM.
vi.mock("./ai/engine", () => ({
  runService: vi.fn(async () => "MOCK_RESULT"),
  adjustService: vi.fn(async () => "MOCK_ADJUSTED"),
}));

// In-memory DB mock covering the helpers the session router uses.
const state = {
  sessions: new Map<string, any>(),
  messages: new Map<string, { role: string; content: string }[]>(),
  services: new Map<string, any>([
    ["cv-granskning", { slug: "cv-granskning", promptKey: "cv_granskning", hasAdjustments: true, maxRounds: 3, priceSek: 49 }],
  ]),
};

vi.mock("./db", () => ({
  getSession: vi.fn(async (id: string) => state.sessions.get(id)),
  getServiceBySlug: vi.fn(async (slug: string) => state.services.get(slug)),
  getMessages: vi.fn(async (id: string) => state.messages.get(id) ?? []),
  addMessage: vi.fn(async (id: string, role: string, content: string) => {
    const arr = state.messages.get(id) ?? [];
    arr.push({ role, content });
    state.messages.set(id, arr);
  }),
  updateSession: vi.fn(async (id: string, patch: any) => {
    state.sessions.set(id, { ...state.sessions.get(id), ...patch });
  }),
  listServices: vi.fn(async () => [...state.services.values()]),
  getCmsTexts: vi.fn(async () => []),
  getCmsStyles: vi.fn(async () => []),
  getCmsFaq: vi.fn(async () => []),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("session payment gate + adjustment rounds", () => {
  beforeEach(() => {
    state.sessions.clear();
    state.messages.clear();
  });

  it("refuses to run the AI before payment is confirmed", async () => {
    state.sessions.set("s1", {
      id: "s1",
      serviceSlug: "cv-granskning",
      paymentStatus: "unpaid",
      inputText: "CV text",
      remainingRounds: 3,
    });
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.session.run({ id: "s1" })).rejects.toThrow(/Betalning/);
  });

  it("runs once when paid and stores the result", async () => {
    state.sessions.set("s2", {
      id: "s2",
      serviceSlug: "cv-granskning",
      paymentStatus: "paid",
      inputText: "CV text",
      remainingRounds: 3,
    });
    const caller = appRouter.createCaller(publicCtx());
    const r = await caller.session.run({ id: "s2" });
    expect(r.content).toBe("MOCK_RESULT");
  });

  it("decrements adjustment rounds and locks at zero", async () => {
    state.sessions.set("s3", {
      id: "s3",
      serviceSlug: "cv-granskning",
      paymentStatus: "paid",
      inputText: "CV text",
      remainingRounds: 1,
    });
    state.messages.set("s3", [{ role: "assistant", content: "first" }]);
    const caller = appRouter.createCaller(publicCtx());

    const r1 = await caller.session.adjust({ id: "s3", feedback: "mer formell" });
    expect(r1.remainingRounds).toBe(0);
    expect(r1.locked).toBe(true);

    await expect(caller.session.adjust({ id: "s3", feedback: "igen" })).rejects.toThrow(/förbrukade/);
  });
});
