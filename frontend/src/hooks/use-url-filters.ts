"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Filters, search and pagination live in the URL (?page=2&condition=CRITICAL)
 * so lists can be shared and the back button works.
 *
 *   const [filters, setFilters] = useUrlFilters({ page: "1", search: "" });
 *   setFilters({ search: "karim" }); // also resets page to 1
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => {
    const values = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const fromUrl = searchParams.get(key as string);
      if (fromUrl !== null) values[key] = fromUrl as T[keyof T];
    }
    return values;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setFilters = useCallback(
    (changes: Partial<T>) => {
      const next = new URLSearchParams(searchParams.toString());
      const changesPage = "page" in changes;

      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === "" || value === defaults[key]) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      // Any filter change goes back to the first page.
      if (!changesPage) next.delete("page");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname, router],
  );

  return [filters, setFilters] as const;
}

/** "2" -> 2, invalid/empty -> fallback */
export const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
