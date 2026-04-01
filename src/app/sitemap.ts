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

  return locales.flatMap((lang) =>
    allRoutes.map((route) => ({
      url: `${BASE_URL}/${lang}${route}`,
      lastModified: new Date(),
    }))
  );
}
