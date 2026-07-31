export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 border-t border-border-strong pt-6 sm:mb-12">
      <h2 className="type-title flex items-baseline gap-3 text-[26px] text-foreground sm:text-[32px]">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 shrink-0 self-center bg-primary"
        />
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-[36rem] leading-relaxed text-muted-foreground [text-wrap:pretty]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
