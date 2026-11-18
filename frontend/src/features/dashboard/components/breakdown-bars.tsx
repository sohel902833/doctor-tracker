import type { ReactNode } from "react";
import { EmptyState } from "@/components/feedback/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type BreakdownRow = {
  key: string;
  label: ReactNode;
  /** Plain text of the label, for the tooltip. */
  title: string;
  value: number;
  detail?: string;
  /** CSS color of the bar; defaults to the first series color. */
  color?: string;
};

/**
 * Ranked horizontal bars: the label and the number are text, the bar only
 * shows relative size, so nothing depends on color alone.
 */
export function BreakdownBars({
  title,
  description,
  rows,
  valueLabel,
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  valueLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No data in this period" />
        ) : (
          <ul className="space-y-3" aria-label={title}>
            {rows.map((row) => (
              <li key={row.key} title={`${row.title}: ${row.value.toLocaleString()} ${valueLabel}`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{row.label}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-medium">{row.value.toLocaleString()}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {row.detail ?? `${Math.round((row.value / Math.max(total, 1)) * 100)}%`}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? "var(--series-1)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
