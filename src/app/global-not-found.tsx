import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AppShell } from "./shell";

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
 * languages rather than picking one.
 */
export default function GlobalNotFound() {
  return (
    <AppShell lang="en">
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="type-display mb-4 text-6xl text-primary">404</h1>
        <p className="text-xl text-muted-foreground">페이지를 찾을 수 없습니다</p>
        <p className="mt-1 text-xl text-muted-foreground">Page not found</p>
        <Link
          href="/"
          className="type-lead mt-8 inline-flex min-h-11 items-center bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          홈으로 · Home
        </Link>
      </div>
    </AppShell>
  );
}
