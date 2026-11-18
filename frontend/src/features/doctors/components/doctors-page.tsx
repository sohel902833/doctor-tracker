"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { UserCell } from "@/components/common/user-cell";
import { DataTable } from "@/components/data-table/data-table";
import { DateRangeFilter, endOfDay, FilterBar, FilterSelect, SearchInput } from "@/components/data-table/filters";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { EmptyState, NoAccess } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan } from "@/features/auth/session-provider";
import { DoctorPatientsSheet } from "@/features/doctor-patients/components/doctor-patients-sheet";
import { useHospitalOptions } from "@/features/hospitals/hooks";
import { UserFormDialog } from "@/features/users/components/user-form-dialog";
import { useDeleteUser, useUsers } from "@/features/users/hooks";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/models";

const DEFAULTS = { page: "1", limit: "10", search: "", specialization: "", hospital: "", from: "", to: "" };

const currentHospital = (doctor: User) =>
  doctor.hospitals.find((h) => h.isCurrent)?.hospital?.name ?? doctor.hospitals[0]?.hospital?.name;

export function DoctorsPage() {
  const canRead = useCan("user.read");
  const canUpdate = useCan("user.update");
  const canDelete = useCan("user.delete");
  const canSeePatients = useCan("patient.read");
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const hospitalOptions = useHospitalOptions();
  const doctors = useUsers({
    userType: "DOCTOR",
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    specialization: filters.specialization,
    hospital: filters.hospital,
    createdFrom: filters.from,
    createdTo: endOfDay(filters.to),
  });
  const deleteDoctor = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      { header: "Doctor", cell: ({ row }) => <UserCell name={row.original.name} subtitle={row.original.email} /> },
      {
        header: "Specialization",
        cell: ({ row }) =>
          row.original.doctorProfile?.specialization ? (
            <Badge variant="secondary">{row.original.doctorProfile.specialization}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { header: "Hospital", cell: ({ row }) => currentHospital(row.original) ?? <span className="text-muted-foreground">—</span> },
      { header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      { header: "Joined", cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: "Patients", icon: UsersRound, hidden: !canSeePatients, onClick: () => setViewing(row.original) },
              { label: "Edit", icon: Pencil, hidden: !canUpdate, onClick: () => { setEditing(row.original); setFormOpen(true); } },
              { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, onClick: () => setDeleting(row.original) },
            ]}
          />
        ),
      },
    ],
    [canUpdate, canDelete, canSeePatients],
  );

  if (!canRead) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Doctors"
        description="Manage doctors and the patients assigned to them."
        actions={
          <PermissionGate permission="user.create">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Add doctor</Button>
          </PermissionGate>
        }
      />
      <FilterBar onReset={() => setFilters(DEFAULTS)}>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Search name, email, phone…" />
        <SearchInput value={filters.specialization} onChange={(specialization) => setFilters({ specialization })} placeholder="Specialization…" className="md:w-48" />
        <FilterSelect value={filters.hospital} onChange={(hospital) => setFilters({ hospital })} placeholder="Hospitals" options={hospitalOptions} />
        <DateRangeFilter label="Joined" from={filters.from} to={filters.to} onChange={({ from, to }) => setFilters({ from, to })} />
      </FilterBar>
      <DataTable
        columns={columns}
        data={doctors.data?.items}
        meta={doctors.data?.meta}
        isLoading={doctors.isLoading}
        isFetching={doctors.isFetching}
        error={doctors.error}
        onRetry={doctors.refetch}
        onRowClick={canSeePatients ? setViewing : undefined}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        empty={<EmptyState title="No doctors found" description="Try different filters, or add a doctor." />}
      />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} userTypes={["DOCTOR"]} title={editing ? "Edit doctor" : "Add doctor"} />
      <DoctorPatientsSheet doctor={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="A doctor who still has patients can't be deleted. Remove their patients first."
        isPending={deleteDoctor.isPending}
        onConfirm={() =>
          deleting &&
          deleteDoctor.mutate(deleting._id, {
            onSuccess: () => { toast.success("Doctor deleted"); setDeleting(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
