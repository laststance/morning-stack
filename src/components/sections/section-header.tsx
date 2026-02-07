import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Emoji or icon displayed before the title. */
  icon: string;
  /** Section title text. */
  title: string;
  /** Optional "View All" link URL. */
  viewAllHref?: string;
  /** Extra CSS classes for the root element. */
  className?: string;
}

/**
 * Shared section header with icon, title, and optional "View All" link.
 *
 * Used by every content section (Tech, GitHub, HN, Reddit, etc.)
 * for consistent heading treatment across the home page.
 */
export function SectionHeader({
  icon,
  title,
  viewAllHref,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b border-ms-border pb-2 mb-1", className)}>
      <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-ms-text-primary">
        <span role="img" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>

      {viewAllHref && (
        <a
          href={viewAllHref}
          className="text-xs font-medium text-ms-accent transition-colors hover:text-ms-accent/80"
        >
          View All
        </a>
      )}
    </div>
  );
}
