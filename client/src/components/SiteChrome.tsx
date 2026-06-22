import { Link } from "wouter";
import { useCms } from "@/contexts/CmsContext";
import { useTenant } from "@/contexts/TenantContext";

export function SiteHeader() {
  const { getText } = useCms();
  const { tenant } = useTenant();
  const isCoach = tenant?.type === "coach";
  const brand = isCoach ? tenant!.name : getText("brand.name", "Jobbhjälpen");
  const logoChar = isCoach ? (tenant!.logoText || tenant!.name.charAt(0)) : "J";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-md text-sm font-bold text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            {logoChar}
          </span>
          <span className="font-display text-lg font-semibold">{brand}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm sm:flex">
          <a href="/#tjanster" className="text-muted-foreground transition-colors hover:text-foreground">
            Tjänster
          </a>
          <a href="/#sa-funkar-det" className="text-muted-foreground transition-colors hover:text-foreground">
            Så funkar det
          </a>
          <a href="/#faq" className="text-muted-foreground transition-colors hover:text-foreground">
            Vanliga frågor
          </a>
        </nav>
        <a
          href="/#tjanster"
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-primary)" }}
        >
          Kom igång
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { getText } = useCms();
  const { tenant } = useTenant();
  const isCoach = tenant?.type === "coach";
  const brand = isCoach ? tenant!.name : getText("brand.name", "Jobbhjälpen");
  const tagline = isCoach
    ? (tenant!.tagline || "")
    : getText("footer.tagline", "Specialiserade dokumenttjänster för jobbsök och privatliv.");
  return (
    <footer className="mt-24 border-t">
      <div className="container flex flex-col items-start justify-between gap-4 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-base font-semibold">{brand}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/integritet" className="hover:text-foreground">
            Integritet & cookies
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
