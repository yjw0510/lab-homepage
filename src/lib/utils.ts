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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}
