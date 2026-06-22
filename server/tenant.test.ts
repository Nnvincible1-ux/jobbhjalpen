import { describe, expect, it } from "vitest";
import { resolveTenantSlug } from "./tenant";

function req(host: string, query: Record<string, string> = {}) {
  return { headers: { host }, query } as any;
}

describe("tenant resolver", () => {
  it("uses ?tenant= override for dev/testing", () => {
    expect(resolveTenantSlug(req("anything.example.com", { tenant: "karriarlyftet" }))).toBe("karriarlyftet");
  });

  it("maps sandbox/preview and bare hosts to default", () => {
    expect(resolveTenantSlug(req("localhost:3000"))).toBe("default");
    expect(resolveTenantSlug(req("abc123.manus.computer"))).toBe("default");
    expect(resolveTenantSlug(req("jobbhjalpen.manus.space"))).toBe("default");
    expect(resolveTenantSlug(req("example.com"))).toBe("default");
  });

  it("extracts the tenant slug from a subdomain", () => {
    expect(resolveTenantSlug(req("karriarlyftet.jobbhjalpen.se"))).toBe("karriarlyftet");
  });

  it("treats platform subdomains as default", () => {
    expect(resolveTenantSlug(req("www.jobbhjalpen.se"))).toBe("default");
    expect(resolveTenantSlug(req("app.jobbhjalpen.se"))).toBe("default");
  });
});
