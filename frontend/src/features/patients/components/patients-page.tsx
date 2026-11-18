"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConditionBadge } from "@/components/common/condition-badge";
import { RowActions } from "@/components/common/row-actions";
import { UserCell } from "@/components/common/user-cell";
import { DataTable } from "@/components/data-table/data-table";
import { DateRangeFilter, endOfDay, FilterBar, FilterSelect, SearchInput } from "@/components/data-table/filters";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { EmptyState, NoAccess } from "@/components/feedback/states";
import { toOptions } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan, useSession } from "@/features/auth/session-provider";
import { useDoctorOptions } from "@/features/users/hooks";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { CONDITIONS, GENDERS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import type { Patient } from "@/lib/models";
import { useDeletePatient, usePatients } from "../hooks";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientHistorySheet } from "./patient-history-sheet";

const DEFAULTS = { page: "1", limit: "10", search: "", condition: "", gender: "", doctor: "", from: "", to: "" };

export function PatientsPage() {
  const user = useSession();
  const isAdmin = user.userType === "ADMIN";
  const canRead = useCan("patient.read");
  const canUpdate = useCan("patient.update");
  const canDelete = useCan("patient.delete");
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const doctorOptions = useDoctorOptions(isAdmin);
  const patients = usePatients({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    condition: filters.condition,
    gender: filters.gender,
    doctor: filters.doctor,
    createdFrom: filters.from,
    createdTo: endOfDay(filters.to),
  });
  const deletePatient = useDeletePatient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Patient, unknown>[]>(
    () => [
      { header: "Patient", cell: ({ row }) => <UserCell name={row.original.name} subtitle={row.original.phone} /> },
      {
        header: "Age / gender",
        cell: ({ row }) =>
          [row.original.age != null && `${row.original.age} yrs`, row.original.gender && humanize(row.original.gender)]
            .filter(Boolean)
            .join(" · ") || "—",
      },
      { header: "Blood", cell: ({ row }) => row.original.bloodGroup ?? "—" },
      { header: "Condition", cell: ({ row }) => <ConditionBadge condition={row.original.patientProfile?.currentCondition} /> },
      {
        header: "Doctors",
        cell: ({ row }) =>
          row.original.doctors?.length ? (
            <div className="flex max-w-56 flex-wrap gap-1">
              {row.original.doctors.map((d) => <Badge key={d._id} variant="outline">{d.name}</Badge>)}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { header: "Registered", cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: "History", icon: History, onClick: () => setHistoryFor(row.original._id) },
              { label: "Edit", icon: Pencil, hidden: !canUpdate, onClick: () => { setEditing(row.original); setFormOpen(true); } },
              { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, onClick: () => setDeleting(row.original) },
            ]}
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

  if (!canRead) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Patients"
        description="All patients, their current condition and doctors."
        actions={
          <PermissionGate permission="patient.create">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Add patient</Button>
          </PermissionGate>
        }
      />
      <FilterBar onReset={() => setFilters(DEFAULTS)}>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Search name, phone, email…" />
        <FilterSelect value={filters.condition} onChange={(condition) => setFilters({ condition })} placeholder="Conditions" options={toOptions(CONDITIONS, humanize)} />
        <FilterSelect value={filters.gender} onChange={(gender) => setFilters({ gender })} placeholder="Genders" options={toOptions(GENDERS, humanize)} />
        {isAdmin && <FilterSelect value={filters.doctor} onChange={(doctor) => setFilters({ doctor })} placeholder="Doctors" options={doctorOptions} />}
        <DateRangeFilter label="Registered" from={filters.from} to={filters.to} onChange={({ from, to }) => setFilters({ from, to })} />
      </FilterBar>
      <DataTable
        columns={columns}
        data={patients.data?.items}
        meta={patients.data?.meta}
        isLoading={patients.isLoading}
        isFetching={patients.isFetching}
        error={patients.error}
        onRetry={patients.refetch}
        onRowClick={(row) => setHistoryFor(row._id)}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        empty={<EmptyState title="No patients found" description="Try different filters." />}
      />
      <PatientFormDialog open={formOpen} onOpenChange={setFormOpen} patient={editing} />
      <PatientHistorySheet patientId={historyFor} onOpenChange={(open) => !open && setHistoryFor(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="The patient is removed from all doctors' lists. Consultation records are kept."
        isPending={deletePatient.isPending}
        onConfirm={() =>
          deleting &&
          deletePatient.mutate(deleting._id, {
            onSuccess: () => { toast.success("Patient deleted"); setDeleting(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
