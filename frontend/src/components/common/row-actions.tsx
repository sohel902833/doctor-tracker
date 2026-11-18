"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

/** Icon buttons in a table's Actions column. Clicks don't trigger the row click. */
export function RowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {actions
        .filter((action) => !action.hidden)
        .map(({ label, icon: Icon, onClick, destructive }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label}
                onClick={onClick}
                className={cn(destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
    </div>
  );
}
