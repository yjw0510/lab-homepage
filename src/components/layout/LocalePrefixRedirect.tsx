"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/basePath";

/**
 * Mounted on the 404 only. A path with no locale segment, such as /people, is sent to its English
 * page by the same rule as the root redirect. A path that already starts with a locale is left
 * alone, so a page missing under /en as well stops here once instead of looping.
 */
export function LocalePrefixRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const path =
      BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
    const first = path.split("/")[1];
    if (first === "en" || first === "ko") return;
    window.location.replace(`${BASE_PATH}/en${path}${search}${hash}`);
  }, []);

  return null;
}
