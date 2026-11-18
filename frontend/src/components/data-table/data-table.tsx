"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaginationMeta } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[] | undefined;
  meta?: PaginationMeta;
  isLoading?: boolean;
  /** True while a new page loads; the previous page stays visible, dimmed. */
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  getRowId?: (row: T) => string;
};

/**
 * Server-side table: the backend does pagination/filtering, this renders a
 * page of rows with loading, empty and error states.
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onLimitChange,
  onRowClick,
  empty,
  getRowId = (row) => (row as { _id: string })._id,
}: DataTableProps<T>) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    pageCount: meta?.totalPages ?? -1,
  });

  const columnCount = columns.length;
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    style={{ width: header.column.columnDef.size !== 150 ? header.column.columnDef.size : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount}>
                  <ErrorState message={error.message} onRetry={onRetry} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount}>{empty ?? <EmptyState />}</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {meta && onPageChange && (
        <Pagination meta={meta} onPageChange={onPageChange} onLimitChange={onLimitChange} />
      )}
    </div>
  );
}
