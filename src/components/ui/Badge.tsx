import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "type-mono-meta inline-flex items-center border border-border px-2 py-0.5 text-[11px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
