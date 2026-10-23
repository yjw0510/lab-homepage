"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/basePath";

/** Bare `/` lands on English. The Korean pages are reached from the language switch. */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en");
  }, [router]);

  // No spinner. DESIGN.md locks border-radius to 0 with no exception, and this stub ships in the
  // static entry HTML, so the one round thing on the site was the first thing a visitor saw.
  // There is no final layout here to skeleton either; the redirect fires on mount. Without
  // JavaScript it never fires, so the static HTML carries both homes as plain links.
  return (
    <noscript>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-4 px-6 sm:px-8">
        <span className="type-heading text-[15px] text-foreground">Yu Lab</span>
        <a
          href={withBasePath("/en")}
          hrefLang="en"
          className="text-accent-ink underline decoration-1 underline-offset-[3px] hover:text-primary"
        >
          English
        </a>
        <a
          href={withBasePath("/ko")}
          lang="ko"
          hrefLang="ko"
          className="text-accent-ink underline decoration-1 underline-offset-[3px] hover:text-primary"
        >
          한국어
        </a>
      </main>
    </noscript>
  );
}
