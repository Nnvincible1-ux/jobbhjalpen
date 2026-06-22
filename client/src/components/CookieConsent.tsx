import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const KEY = "jh_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) setShow(true);
  }, []);

  const decide = (value: "accepted" | "declined") => {
    localStorage.setItem(KEY, value);
    setShow(false);
    // Analytics scripts should only initialise when value === "accepted".
    if (value === "accepted") {
      window.dispatchEvent(new CustomEvent("cookie-consent-accepted"));
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="container">
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-lg sm:flex sm:items-center sm:gap-6">
          <p className="text-sm text-muted-foreground">
            Vi använder nödvändiga cookies för att sajten ska fungera, och med ditt
            samtycke även cookies för anonym besöksstatistik. Du väljer själv.{" "}
            <Link href="/integritet" className="underline">
              Läs mer
            </Link>
            .
          </p>
          <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
            <Button variant="outline" className="bg-background" onClick={() => decide("declined")}>
              Endast nödvändiga
            </Button>
            <Button onClick={() => decide("accepted")}>Acceptera alla</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
