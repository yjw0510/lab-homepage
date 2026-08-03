"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Bare `/` lands on English. The Korean pages are reached from the language switch. */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
