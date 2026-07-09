import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-accent-ink underline decoration-[1px] underline-offset-[3px] transition-colors hover:text-primary",
        className
      )}
    >
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </a>
  );
}
