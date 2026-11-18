import { Badge } from "@/components/ui/badge";
import { CONDITION_STYLES, type Condition } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConditionBadge({ condition }: { condition?: Condition | null }) {
  if (!condition) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", CONDITION_STYLES[condition])}>
      {humanize(condition)}
    </Badge>
  );
}
