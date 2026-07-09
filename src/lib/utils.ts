export function formatDate(dateString: string, lang?: string): string {
  return new Date(dateString).toLocaleDateString(
    lang === "ko" ? "ko-KR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// One accent sitewide (DESIGN.md §1): categories share a single mono-label
// treatment; the category text itself differentiates.
export function getCategoryColor(_category: string): string {
  return "border border-border text-muted-foreground";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

// Tag color bars are retired (DESIGN.md §3-4); neutral hairline for any
// remaining call site until it drops the usage.
export function getTagColor(_tag: string): string {
  return "bg-border";
}
