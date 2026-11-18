"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/** Row of filters above a table; wraps on small screens. */
export function FilterBar({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      {children}
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="md:ml-auto">
          <X /> Reset
        </Button>
      )}
    </div>
  );
}

/** Search box that only reports a value after typing stops. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const debounced = useDebounce(text, 400);

  // Keep in sync when the URL changes elsewhere (e.g. Reset). Adjusting
  // state during render avoids an extra effect-triggered render.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value);
  }

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn("relative w-full md:w-72", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}

const ALL = "__all__";

/** Select with an "All" option; "" means no filter. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? "" : next)}>
      <SelectTrigger className={cn("w-full md:w-44", className)} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** From–to date inputs (YYYY-MM-DD). */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = "Date",
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm whitespace-nowrap text-muted-foreground lg:inline">{label}</span>
      <Input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(event) => onChange({ from: event.target.value, to })}
        className="w-full md:w-[150px]"
        aria-label={`${label} from`}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(event) => onChange({ from, to: event.target.value })}
        className="w-full md:w-[150px]"
        aria-label={`${label} to`}
      />
    </div>
  );
}

/** "2026-11-30" -> end of that day, so "to" filters include the whole day. */
export const endOfDay = (date: string) => (date ? `${date}T23:59:59.999Z` : "");
