"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ConditionBadge } from "@/components/common/condition-badge";
import { DataTable } from "@/components/data-table/data-table";
import { DateRangeFilter, endOfDay, FilterBar, FilterSelect, SearchInput } from "@/components/data-table/filters";
import { EmptyState, NoAccess } from "@/components/feedback/states";
import { toOptions } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan, useSession } from "@/features/auth/session-provider";
import { useDoctorOptions } from "@/features/users/hooks";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { CONDITIONS } from "@/lib/constants";
import { formatDateTime, humanize } from "@/lib/format";
import type { Consultation } from "@/lib/models";
import { useConsultations } from "../hooks";

const DEFAULTS = { page: "1", limit: "10", search: "", condition: "", doctor: "", from: "", to: "" };

export function ConsultationsPage() {
  const user = useSession();
  const isDoctor = user.userType === "DOCTOR";
  const canRead = useCan("consultation.read");
  const canCreate = useCan("consultation.create");
  const router = useRouter();
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const doctorOptions = useDoctorOptions(!isDoctor);
  const consultations = useConsultations({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    condition: filters.condition,
    doctor: filters.doctor,
    visitedFrom: filters.from,
    visitedTo: endOfDay(filters.to),
  });

  const columns = useMemo<ColumnDef<Consultation, unknown>[]>(
    () => [
      { header: "Prescription", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.prescriptionNo}</span> },
      {
        header: "Patient",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.patientSnapshot.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.patientSnapshot.phone}</p>
          </div>
        ),
      },
      ...(!isDoctor
        ? [{ header: "Doctor", cell: ({ row }: { row: { original: Consultation } }) => row.original.doctorSnapshot.name } as ColumnDef<Consultation, unknown>]
        : []),
      {
        header: "Visit",
        cell: ({ row }) => (
          <Badge variant="secondary">
            #{row.original.visitNumber} · {row.original.visitType === "FIRST" ? "First" : "Follow-up"}
          </Badge>
        ),
      },
      { header: "Condition", cell: ({ row }) => <ConditionBadge condition={row.original.condition} /> },
      { header: "Medicines", cell: ({ row }) => <span className="tabular-nums">{row.original.medicines.length}</span> },
      { header: "Date", cell: ({ row }) => formatDateTime(row.original.visitedAt) },
    ],
    [isDoctor],
  );

  if (!canRead) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Consultations"
        description={isDoctor ? "Every visit you've recorded." : "Every visit across all doctors."}
        actions={
          isDoctor && canCreate && (
            <Button asChild><Link href="/consultations/new"><FilePlus2 /> New consultation</Link></Button>
          )
        }
      />
      <FilterBar onReset={() => setFilters(DEFAULTS)}>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Prescription no. or patient…" />
        <FilterSelect value={filters.condition} onChange={(condition) => setFilters({ condition })} placeholder="Conditions" options={toOptions(CONDITIONS, humanize)} />
        {!isDoctor && <FilterSelect value={filters.doctor} onChange={(doctor) => setFilters({ doctor })} placeholder="Doctors" options={doctorOptions} />}
        <DateRangeFilter label="Visited" from={filters.from} to={filters.to} onChange={({ from, to }) => setFilters({ from, to })} />
      </FilterBar>
      <DataTable
        columns={columns}
        data={consultations.data?.items}
        meta={consultations.data?.meta}
        isLoading={consultations.isLoading}
        isFetching={consultations.isFetching}
        error={consultations.error}
        onRetry={consultations.refetch}
        onRowClick={(row) => router.push(`/consultations/${row._id}`)}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        empty={<EmptyState title="No consultations found" description="Saved consultations appear here." />}
      />
    </>
  );
}
