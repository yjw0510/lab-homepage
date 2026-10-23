import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AppShell } from "./shell";
import { LocalePrefixRedirect } from "@/components/layout/LocalePrefixRedirect";

export const metadata: Metadata = {
  title: "404 | Yu Lab",
  description: "Page not found",
};

/**
 * The 404 for any URL that matches no route.
 *
 * `not-found.tsx` cannot serve this once the app has two root layouts, one per route group —
 * there is no single layout left to compose a global 404 from, so Next falls back to its own
 * stock English page. On a static export that page is `out/404.html`, which is what GitHub Pages
 * returns for every unmatched URL, so the site was answering with an unstyled `<html>` carrying
 * no `lang` at all: the same WCAG 3.1.1 defect the two-root-layout change was made to close.
 * `global-not-found` is Next's answer for exactly this case and must return a whole document
 * (docs/01-app/03-api-reference/03-file-conventions/not-found.md:45-72,123).
 *
 * It sits outside `[lang]`, so like the redirect stub it has no dictionary and answers in both
 * languages rather than picking one: one link home per language, since `/` lands on English.
 * The wordmark is static for the same reason.
 */
export default function GlobalNotFound() {
  return (
    <AppShell lang="en">
      <LocalePrefixRedirect />
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center px-6 sm:px-8">
          <div className="flex items-baseline gap-2 text-foreground">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 self-center bg-primary" />
            <span className="type-heading text-[15px] leading-[1.7]">Yu Lab</span>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="type-display mb-4 text-6xl text-primary">404</h1>
        <p lang="ko" className="text-xl text-muted-foreground">
          페이지를 찾을 수 없습니다.
        </p>
        <p className="mt-1 text-xl text-muted-foreground">Page not found.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/ko"
            lang="ko"
            hrefLang="ko"
            className="type-lead inline-flex min-h-11 items-center bg-primary-fill px-6 py-3 text-primary-foreground transition-colors hover:bg-primary-fill/90"
          >
            한국어 홈
          </Link>
          <Link
            href="/en"
            hrefLang="en"
            className="type-lead inline-flex min-h-11 items-center border border-border-strong px-6 py-3 text-foreground transition-colors hover:bg-muted"
          >
            English home
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
