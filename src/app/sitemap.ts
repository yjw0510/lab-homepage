import type { MetadataRoute } from "next";
import { getAllMultiscaleAreas } from "@/lib/multiscale";
import { getAllPublications } from "@/lib/publications";

export const dynamic = "force-static";

const BASE_URL = "https://yu-mmcc.org";
const locales = ["en", "ko"];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/multiscale",
    "/research-topics",
    "/publications",
    "/people",
    "/news",
    "/funding",
    "/contact",
  ];

  const multiscaleSlugs = getAllMultiscaleAreas().map(
    (area) => `/multiscale/${area.slug}`
  );
  const publicationSlugs = getAllPublications().map(
    (pub) => `/publications/${pub.slug}`
  );

  const allRoutes = [...staticRoutes, ...multiscaleSlugs, ...publicationSlugs];

  // Each entry names both language versions (itself included), which is how search engines
  // learn that /en/x and /ko/x are one page.
  return locales.flatMap((lang) =>
    allRoutes.map((route) => ({
      url: `${BASE_URL}/${lang}${route}`,
      lastModified: new Date(),
      alternates: {
        languages: {
          ...Object.fromEntries(locales.map((l) => [l, `${BASE_URL}/${l}${route}`])),
          // "/" redirects to English, so English is the fallback for other languages.
          "x-default": `${BASE_URL}/en${route}`,
        },
      },
    }))
  );
}
