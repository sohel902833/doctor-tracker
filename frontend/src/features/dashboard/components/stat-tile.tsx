import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** A headline number. Not a chart: one value reads best as text. */
export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number | undefined;
  detail?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
          )}
          {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
