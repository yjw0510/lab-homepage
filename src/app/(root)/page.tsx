"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Bare `/` lands on English. The Korean pages are reached from the language switch. */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en");
  }, [router]);

  // No spinner. DESIGN.md locks border-radius to 0 with no exception, and this stub ships in the
  // static entry HTML, so the one round thing on the site was the first thing a visitor saw.
  // There is no final layout here to skeleton either; the redirect fires on mount.
  return <div className="min-h-screen" />;
}
