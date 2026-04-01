"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, FlaskConical } from "lucide-react";
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

export function Navbar({ lang, dict }: { lang: string; dict: Dictionary }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2 group">
            <FlaskConical className="w-6 h-6 text-primary group-hover:text-primary-light transition-colors" />
            <span className="font-semibold text-foreground">Yu Lab</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const localizedHref =
                item.href === "/" ? `/${lang}` : `/${lang}${item.href}`;
              const isActive =
                item.href === "/"
                  ? pathname === `/${lang}` || pathname === `/${lang}/`
                  : pathname.startsWith(`/${lang}${item.href}`);
              const label =
                dict.nav[navKeyMap[item.href] ?? "home"] ?? item.label;
              return (
                <Link
                  key={item.href}
                  href={localizedHref}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors",
                    isActive
                      ? "text-primary font-medium bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <div className="ml-2 flex items-center gap-1">
              <LanguageToggle lang={lang} />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle lang={lang} />
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navigation.map((item) => {
              const localizedHref =
                item.href === "/" ? `/${lang}` : `/${lang}${item.href}`;
              const isActive =
                item.href === "/"
                  ? pathname === `/${lang}` || pathname === `/${lang}/`
                  : pathname.startsWith(`/${lang}${item.href}`);
              const label =
                dict.nav[navKeyMap[item.href] ?? "home"] ?? item.label;
              return (
                <Link
                  key={item.href}
                  href={localizedHref}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-3 py-3 text-sm rounded-lg transition-colors",
                    isActive
                      ? "text-primary font-medium bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
