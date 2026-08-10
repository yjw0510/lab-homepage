import localFont from "next/font/local";
import Script from "next/script";

// One text family for both scripts. The second face was Latin-only, so every Korean string
// in the metadata register fell back mid-line to a system Hangul face at a monospace-ish
// advance. Pretendard carries the whole scientific character set the register needs —
// Å µ ≈ → superscripts, subscripts, Greek — plus tabular figures, so the register survives
// as a style rather than a family. Code keeps a real monospace via --font-mono.
const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

/**
 * The `<html>`/`<body>` shell, shared by the two root layouts.
 *
 * There are two because `lang` has to be in the static HTML. With a single root layout above
 * `[lang]` the only place that knows the locale is a client effect, so every one of the ~20
 * Korean pages shipped `<html lang="en">` over Hangul and only corrected after hydration —
 * which crawlers, translation tools and reader modes never see. Next's answer is to drop the
 * top-level layout and give each route group its own root
 * (docs/01-app/01-getting-started/02-project-structure.md, "Creating multiple root layouts").
 */
export function AppShell({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      className={`${pretendard.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground break-keep">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Dark unless the visitor has chosen otherwise here before. The OS preference
                  // is deliberately not consulted: these pages are mostly dark 3D scenes, and
                  // ThemeProvider's initial state matches this exactly so the two cannot
                  // disagree across hydration.
                  var stored = localStorage.getItem('theme');
                  var theme = stored === 'light' ? 'light' : 'dark';
                  var root = document.documentElement;
                  if (theme === 'dark') root.classList.add('dark');
                  else root.classList.remove('dark');
                  root.style.colorScheme = theme;
                } catch (error) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
