import { Card, CardContent } from "@/components/ui/card";

export interface UnavailableWidgetStateProps {
  /** Short unavailable state label shown as the row title. */
  title: string;
  /** Human-readable reason or expectation for the missing widget data. */
  detail: string;
}

/**
 * Renders compact widget status rows when edition-side data is missing.
 * @param title - Short label for the unavailable widget data.
 * @param detail - One-line reason shown below the label.
 * @returns Compact card row that does not compete with the lead story.
 * @example
 * <UnavailableWidgetState title="Weather unavailable" detail="No weather snapshot for this edition." />
 */
export function UnavailableWidgetState({
  title,
  detail,
}: UnavailableWidgetStateProps) {
  return (
    <Card className="glass-panel border-ms-glass-border rounded-md py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2.5">
        <span
          className="bg-ms-text-muted/50 size-1.5 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-ms-text-secondary text-xs font-medium">{title}</p>
          <p className="text-ms-text-muted truncate text-[11px] leading-snug">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
