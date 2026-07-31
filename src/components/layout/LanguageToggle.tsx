"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageToggle({ lang }: { lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const targetLang = lang === "ko" ? "en" : "ko";
  const targetPathname = pathname.replace(`/${lang}`, `/${targetLang}`);

  return (
    <button
      type="button"
      className="flex min-h-11 items-center gap-1.5 px-2.5 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={targetLang === "ko" ? "한국어로 전환" : "Switch to English"}
      onClick={() => {
        const search = window.location.search;
        router.push(`${targetPathname}${search}`);
      }}
    >
      <Globe className="h-4 w-4" strokeWidth={1.75} />
      <span className="type-mono-meta text-[12px] font-[500]">
        {targetLang.toUpperCase()}
      </span>
    </button>
  );
}
