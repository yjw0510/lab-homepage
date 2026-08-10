import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import "molstar/build/viewer/molstar.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppShell } from "../shell";
import { SITE_METADATA } from "../metadata";
import { getDictionary, hasLocale, locales } from "./dictionaries";

export const metadata: Metadata = SITE_METADATA;

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <AppShell lang={lang}>
      <ThemeProvider>
        <Navbar lang={lang} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} dict={dict} />
      </ThemeProvider>
    </AppShell>
  );
}
