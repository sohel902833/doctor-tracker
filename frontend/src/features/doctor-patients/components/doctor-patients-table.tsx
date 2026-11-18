"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, type ReactNode } from "react";
import { ConditionBadge } from "@/components/common/condition-badge";
import { UserCell } from "@/components/common/user-cell";
import { DataTable } from "@/components/data-table/data-table";
import {
  DateRangeFilter,
  endOfDay,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/data-table/filters";
import { EmptyState } from "@/components/feedback/states";
import { toOptions } from "@/components/form/fields";
import { CONDITIONS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import type { DoctorPatientRow } from "@/lib/models";
import type { DoctorRef } from "../api";
import { useDoctorPatients } from "../hooks";

export type DoctorPatientFilters = {
  page: string;
  limit: string;
  search: string;
  condition: string;
  status: string;
  from: string;
  to: string;
};

export const DOCTOR_PATIENT_DEFAULTS: DoctorPatientFilters = {
  page: "1",
  limit: "10",
  search: "",
  condition: "",
  status: "ACTIVE",
  from: "",
  to: "",
};

/**
 * A doctor's patient list with filters. Used by the admin Doctors sheet
 * (local state) and the doctor's My patients page (URL state).
 */
export function DoctorPatientsTable({
  doctorId,
  filters,
  setFilters,
  renderActions,
  onRowClick,
  emptyAction,
}: {
  doctorId: DoctorRef;
  filters: DoctorPatientFilters;
  setFilters: (changes: Partial<DoctorPatientFilters>) => void;
  renderActions: (row: DoctorPatientRow) => ReactNode;
  onRowClick?: (row: DoctorPatientRow) => void;
  emptyAction?: ReactNode;
}) {
  const list = useDoctorPatients(doctorId, {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    condition: filters.condition,
    status: filters.status,
    lastVisitFrom: filters.from,
    lastVisitTo: endOfDay(filters.to),
  });

  const columns = useMemo<ColumnDef<DoctorPatientRow, unknown>[]>(
    () => [
      { header: "Patient", cell: ({ row }) => <UserCell name={row.original.patient.name} subtitle={row.original.patient.phone} /> },
      {
        header: "Age / gender",
        cell: ({ row }) =>
          [row.original.patient.age != null && `${row.original.patient.age} yrs`, row.original.patient.gender && humanize(row.original.patient.gender)]
            .filter(Boolean)
            .join(" · ") || "—",
      },
      { header: "Visits", cell: ({ row }) => <span className="tabular-nums">{row.original.visitCount}</span> },
      { header: "First visit", cell: ({ row }) => formatDate(row.original.firstVisitAt) },
      { header: "Last visit", cell: ({ row }) => formatDate(row.original.lastVisitAt) },
      { header: "Last condition", cell: ({ row }) => <ConditionBadge condition={row.original.lastCondition} /> },
      { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => renderActions(row.original) },
    ],
    [renderActions],
  );

  return (
    <div className="space-y-4">
      <FilterBar onReset={() => setFilters(DOCTOR_PATIENT_DEFAULTS)}>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Search name or phone…" />
        <FilterSelect value={filters.condition} onChange={(condition) => setFilters({ condition })} placeholder="Conditions" options={toOptions(CONDITIONS, humanize)} />
        <FilterSelect
          value={filters.status === "ACTIVE" ? "" : filters.status}
          onChange={(status) => setFilters({ status: status || "ACTIVE" })}
          placeholder="Active"
          options={[{ value: "REMOVED", label: "Removed" }]}
        />
        <DateRangeFilter label="Last visit" from={filters.from} to={filters.to} onChange={({ from, to }) => setFilters({ from, to })} />
      </FilterBar>
      <DataTable
        columns={columns}
        data={list.data?.items}
        meta={list.data?.meta}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={list.refetch}
        onRowClick={onRowClick}
        getRowId={(row) => row._id}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        empty={<EmptyState title="No patients" description="Patients appear here once added or seen." action={emptyAction} />}
      />
    </div>
  );
}
