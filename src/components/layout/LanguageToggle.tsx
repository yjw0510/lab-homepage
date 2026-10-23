"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

/**
 * A real link to the same page in the other language, so it opens in a new tab and crawlers can
 * follow it. The visible text is the target language's own name and is also the accessible name
 * (WCAG 2.5.3), marked with that language so a screen reader voices it correctly.
 */
export function LanguageToggle({ lang }: { lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const targetLang = lang === "ko" ? "en" : "ko";
  const targetPathname = pathname.replace(`/${lang}`, `/${targetLang}`);

  return (
    <Link
      href={targetPathname}
      hrefLang={targetLang}
      lang={targetLang}
      className="flex min-h-11 items-center gap-1.5 px-2.5 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={(e) => {
        // The static href has no query, so a plain click carries it over (the multiscale
        // ?step=). Modified clicks keep the browser's own behaviour.
        const search = window.location.search;
        if (!search || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(`${targetPathname}${search}`);
      }}
    >
      <Globe className="h-4 w-4" strokeWidth={1.75} />
      <span className="type-mono-meta text-[12px]">
        {targetLang === "ko" ? "한국어" : "English"}
      </span>
    </Link>
  );
}
