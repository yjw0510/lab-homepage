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
      className="flex items-center gap-1 px-2.5 py-2.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-11"
      aria-label={`Switch to ${targetLang === "ko" ? "Korean" : "English"}`}
      onClick={() => {
        const search = window.location.search;
        router.push(`${targetPathname}${search}`);
      }}
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{targetLang.toUpperCase()}</span>
    </button>
  );
}
