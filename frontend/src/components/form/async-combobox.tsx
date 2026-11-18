"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/**
 * Search-as-you-type picker backed by the API (e.g. 21k medicines).
 * The server filters; this only renders the current matches.
 */
export function AsyncCombobox<T extends { _id: string }>({
  queryKey,
  fetchOptions,
  selectedLabel,
  value,
  onSelect,
  renderOption,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyText = "No results",
  allowCustom,
  className,
  invalid,
}: {
  queryKey: string;
  fetchOptions: (search: string) => Promise<T[]>;
  selectedLabel?: string | null;
  value?: string | null;
  onSelect: (option: T | null, customText?: string) => void;
  renderOption: (option: T) => ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Offer "Use “text”" for values that aren't in the list. */
  allowCustom?: boolean;
  className?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 250);

  const options = useQuery({
    queryKey: [queryKey, "combobox", debounced],
    queryFn: () => fetchOptions(debounced),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn("w-full justify-between font-normal", !selectedLabel && "text-muted-foreground", className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={searchPlaceholder} />
          <CommandList>
            {options.isFetching && !options.data && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            )}
            {options.data && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {allowCustom && debounced && (
                <CommandItem
                  value={`custom:${debounced}`}
                  onSelect={() => { onSelect(null, debounced); setOpen(false); setSearch(""); }}
                >
                  Use “{debounced}”
                </CommandItem>
              )}
              {options.data?.map((option) => (
                <CommandItem
                  key={option._id}
                  value={option._id}
                  onSelect={() => { onSelect(option); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("size-4", value === option._id ? "opacity-100" : "opacity-0")} />
                  {renderOption(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
