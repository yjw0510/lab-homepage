export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    publication: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    award: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    event: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    general: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };
  return colors[category] || colors.general;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    "water dynamics": "bg-blue-500",
    "molecular dynamics": "bg-cyan-500",
    "Hofmeister series": "bg-teal-500",
    MLFF: "bg-emerald-500",
    "aqueous electrolytes": "bg-sky-500",
    DeePMD: "bg-green-500",
    "polymer brush": "bg-violet-500",
    "coarse-grained MD": "bg-purple-500",
    "shear flow": "bg-fuchsia-500",
    nanoparticle: "bg-amber-500",
    "self-assembly": "bg-orange-500",
    "gold nanoparticle": "bg-yellow-500",
  };
  return colors[tag] || "bg-primary";
}
