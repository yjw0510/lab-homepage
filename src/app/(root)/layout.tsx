import type { Metadata } from "next";
import "../globals.css";
import "molstar/build/viewer/molstar.css";
import { AppShell } from "../shell";
import { SITE_METADATA } from "../metadata";

export const metadata: Metadata = SITE_METADATA;

/**
 * Root layout for the two routes that sit outside `[lang]`: the `/` redirect stub and the
 * 404 page. Both are bilingual or language-neutral, so this shell declares English.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell lang="en">{children}</AppShell>;
}
