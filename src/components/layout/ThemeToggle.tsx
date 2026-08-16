"use client";

import { Sun, Moon } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggle({ lang = "en" }: { lang?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="w-11 h-11" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={
        theme === "dark"
          ? (lang === "ko" ? "라이트 모드로 전환" : "Switch to light mode")
          : (lang === "ko" ? "다크 모드로 전환" : "Switch to dark mode")
      }
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" strokeWidth={1.75} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={1.75} />
      )}
    </button>
  );
}
