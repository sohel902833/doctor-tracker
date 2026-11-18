import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

/** Avatar + name + secondary line, used in people tables. */
export function UserCell({ name, subtitle }: { name: string; subtitle?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
