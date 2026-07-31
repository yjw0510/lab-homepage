import Link from "next/link";

/**
 * This page sits outside the `[lang]` segment, so it has no dictionary and no way to know
 * which language the reader came from. It carries both rather than defaulting to English:
 * a Korean reader who mistyped a URL was being answered only in English.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="type-display mb-4 text-6xl text-primary">404</h1>
      <p className="text-xl text-muted-foreground">페이지를 찾을 수 없습니다</p>
      <p className="mt-1 text-xl text-muted-foreground">Page not found</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center bg-primary px-6 py-3 font-[600] text-primary-foreground transition-colors hover:bg-primary/90"
      >
        홈으로 · Home
      </Link>
    </div>
  );
}
