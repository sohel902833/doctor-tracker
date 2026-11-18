"use client";

import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { PermissionCatalog } from "@/lib/models";
import { cn } from "@/lib/utils";

/** module -> action -> granted */
export type PermissionSelection = Record<string, Record<string, boolean>>;

type Props = {
  catalog: PermissionCatalog;
  value: PermissionSelection;
  onChange: (value: PermissionSelection) => void;
  disabled?: boolean;
};

/**
 * Left: searchable modules, each with a "full access" checkbox.
 * Right: the actions of the active module.
 */
export function PermissionPicker({ catalog, value, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");
  const [activeModule, setActiveModule] = useState(catalog[0]?.module ?? "");

  const modules = useMemo(
    () => catalog.filter((m) => m.label.toLowerCase().includes(search.trim().toLowerCase())),
    [catalog, search],
  );
  const active = catalog.find((m) => m.module === activeModule) ?? modules[0];

  const grantedCount = (module: PermissionCatalog[number]) =>
    module.permissions.filter((p) => value[module.module]?.[p.key]).length;

  const setModule = (module: PermissionCatalog[number], granted: boolean) =>
    onChange({
      ...value,
      [module.module]: Object.fromEntries(module.permissions.map((p) => [p.key, granted])),
    });

  const setAction = (moduleName: string, action: string, granted: boolean) =>
    onChange({ ...value, [moduleName]: { ...value[moduleName], [action]: granted } });

  return (
    <div className={cn("grid overflow-hidden rounded-lg border sm:grid-cols-[220px_1fr]", disabled && "pointer-events-none opacity-50")} aria-disabled={disabled}>
      <div className="border-b bg-muted/30 sm:border-r sm:border-b-0">
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules…"
            className="h-8 pl-8"
            disabled={disabled}
          />
        </div>
        <ul className="max-h-64 overflow-y-auto p-1">
          {modules.map((module) => {
            const count = grantedCount(module);
            const state =
              count === 0 ? false : count === module.permissions.length ? true : "indeterminate";
            return (
              <li key={module.module}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    active?.module === module.module ? "bg-background shadow-sm" : "hover:bg-background/60",
                  )}
                >
                  <Checkbox
                    checked={state}
                    onCheckedChange={(checked) => setModule(module, checked === true)}
                    aria-label={`Full access to ${module.label}`}
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-between text-left"
                    onClick={() => setActiveModule(module.module)}
                  >
                    <span>{module.label}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {count}/{module.permissions.length}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
          {modules.length === 0 && <li className="p-3 text-sm text-muted-foreground">No modules match.</li>}
        </ul>
      </div>

      <div className="p-4">
        {active ? (
          <>
            <p className="mb-3 text-sm font-medium">{active.label} permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {active.permissions.map((permission) => (
                <label
                  key={permission.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <Checkbox
                    checked={value[active.module]?.[permission.key] === true}
                    onCheckedChange={(checked) => setAction(active.module, permission.key, checked === true)}
                    disabled={disabled}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a module.</p>
        )}
      </div>
    </div>
  );
}
