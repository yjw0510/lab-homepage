import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "molstar/build/viewer/molstar.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Yu Lab | Multiscale Molecular Computational Chemistry",
    template: "%s | Yu Lab",
  },
  description:
    "Multiscale Molecular Computational Chemistry Lab at Ajou University. We study molecular phenomena across scales using computational methods including molecular dynamics, machine learning force fields, and first-principles calculations.",
  keywords: [
    "computational chemistry",
    "molecular dynamics",
    "machine learning force fields",
    "Ajou University",
    "Yu Lab",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pretendard.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var theme = stored === 'light' || stored === 'dark'
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
