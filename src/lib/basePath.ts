const ABSOLUTE_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function normalizeBasePath(raw?: string): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed === "/") return "";

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  const withLeadingSlash = withoutTrailingSlash.startsWith("/")
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`;

  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "");

export function withBasePath(path: string): string {
  if (!path) return path;
  if (
    path.startsWith("//") ||
    path.startsWith("#") ||
    path.startsWith("?") ||
    ABSOLUTE_SCHEME_RE.test(path)
  ) {
    return path;
  }

  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(/\/{2,}/g, "/");
  if (!BASE_PATH) return normalizedPath;
  if (normalizedPath === BASE_PATH || normalizedPath.startsWith(`${BASE_PATH}/`)) {
    return normalizedPath;
  }

  return `${BASE_PATH}${normalizedPath}`;
}
