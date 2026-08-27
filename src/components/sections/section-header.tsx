import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Section title text. */
  title: string;
  /** Optional "View All" link URL. */
  viewAllHref?: string;
  /** Extra CSS classes for the root element. */
  className?: string;
}

/**
 * Renders the restrained section rule whenever an editorial source band begins.
 * @returns A consistent h2 and optional view-all affordance without decorative emoji noise.
 * @example
 * <SectionHeader title="Tech News" />
 */
export function SectionHeader({
  title,
  viewAllHref,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "border-ms-border mb-1 flex items-center justify-between border-b pb-2",
        className,
      )}
    >
      <h2 className="text-ms-text-primary text-xs font-semibold tracking-[0.14em] uppercase">
        {title}
      </h2>

      {viewAllHref && (
        <a
          href={viewAllHref}
          className="text-ms-accent hover:text-ms-accent/80 text-xs font-medium transition-colors"
        >
          View All
        </a>
      )}
    </div>
  );
}
