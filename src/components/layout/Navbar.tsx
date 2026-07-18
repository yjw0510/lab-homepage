"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navigation } from "../../../data/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const navKeyMap: Record<string, keyof Dictionary["nav"]> = {
  "/": "home",
  "/multiscale": "multiscale",
  "/research-topics": "topics",
  "/publications": "publications",
  "/people": "people",
  "/news": "news",
  "/funding": "funding",
  "/contact": "contact",
};

function NavLinks({
  lang,
  dict,
  pathname,
  variant,
  onNavigate,
}: {
  lang: string;
  dict: Dictionary;
  pathname: string;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  return (
    <>
      {navigation.map((item) => {
        const localizedHref =
          item.href === "/" ? `/${lang}` : `/${lang}${item.href}`;
        const isActive =
          item.href === "/"
            ? pathname === `/${lang}` || pathname === `/${lang}/`
            : pathname.startsWith(`/${lang}${item.href}`);
        const label = dict.nav[navKeyMap[item.href] ?? "home"] ?? item.label;
        return (
          <Link
            key={item.href}
            href={localizedHref}
            onClick={onNavigate}
            className={cn(
              variant === "desktop"
                ? "px-3 py-2 text-[13.5px] font-[500] transition-colors"
                : "block px-6 py-3 text-sm font-[500] transition-colors sm:px-8",
              isActive
                ? "text-foreground underline decoration-primary decoration-2 underline-offset-[6px]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Navbar({ lang, dict }: { lang: string; dict: Dictionary }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand mark */}
          <Link
            href={`/${lang}`}
            className="flex items-baseline gap-2 text-foreground"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 self-center bg-primary"
            />
            <span className="text-[15px] font-[650] tracking-[-0.015em]">
              Yu Lab
            </span>
            <span className="type-mono-meta text-[11px] text-muted-foreground">
              MMCC
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center lg:flex">
            <NavLinks
              lang={lang}
              dict={dict}
              pathname={pathname}
              variant="desktop"
            />
            <div className="ml-2 flex items-center gap-1">
              <LanguageToggle lang={lang} />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageToggle lang={lang} />
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-sheet"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet below the masthead */}
      {mobileOpen && (
        <div
          id="mobile-nav-sheet"
          className="absolute inset-x-0 top-full border-b border-border bg-background shadow-[0_8px_32px_rgba(16,15,15,0.24)] lg:hidden"
        >
          <div className="divide-y divide-border">
            <NavLinks
              lang={lang}
              dict={dict}
              pathname={pathname}
              variant="mobile"
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
