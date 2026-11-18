"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { UserCell } from "@/components/common/user-cell";
import { DataTable } from "@/components/data-table/data-table";
import { DateRangeFilter, endOfDay, FilterBar, FilterSelect, SearchInput } from "@/components/data-table/filters";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { NoAccess } from "@/components/feedback/states";
import { toOptions } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan } from "@/features/auth/session-provider";
import { useRoles } from "@/features/roles/hooks";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { USER_TYPES } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import type { User } from "@/lib/models";
import { useDeleteUser, useUsers } from "../hooks";
import { UserFormDialog } from "./user-form-dialog";

const DEFAULTS = { page: "1", limit: "10", search: "", userType: "", role: "", isActive: "", from: "", to: "" };

export function UsersPage() {
  const canRead = useCan("user.read");
  const canUpdate = useCan("user.update");
  const canDelete = useCan("user.delete");
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const roles = useRoles();
  const users = useUsers({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    userType: filters.userType,
    role: filters.role,
    isActive: filters.isActive,
    createdFrom: filters.from,
    createdTo: endOfDay(filters.to),
  });
  const deleteUser = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      { header: "User", cell: ({ row }) => <UserCell name={row.original.name} subtitle={row.original.email ?? row.original.phone} /> },
      { header: "Role", cell: ({ row }) => <Badge variant="outline">{row.original.role?.name}</Badge> },
      { header: "Type", cell: ({ row }) => <Badge variant="secondary">{humanize(row.original.userType)}</Badge> },
      { header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      {
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      { header: "Joined", cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
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
        title="Users"
        description="Everyone with an account: admins, doctors and patients."
        actions={
          <PermissionGate permission="user.create">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Add user</Button>
          </PermissionGate>
        }
      />
      <FilterBar onReset={() => setFilters(DEFAULTS)}>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Search name, email, phone…" />
        <FilterSelect value={filters.userType} onChange={(userType) => setFilters({ userType })} placeholder="Types" options={toOptions(USER_TYPES, humanize)} />
        <FilterSelect
          value={filters.role}
          onChange={(role) => setFilters({ role })}
          placeholder="Roles"
          options={(roles.data ?? []).map((r) => ({ value: r._id, label: r.name }))}
        />
        <FilterSelect
          value={filters.isActive}
          onChange={(isActive) => setFilters({ isActive })}
          placeholder="Statuses"
          options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
        />
        <DateRangeFilter label="Joined" from={filters.from} to={filters.to} onChange={({ from, to }) => setFilters({ from, to })} />
      </FilterBar>
      <DataTable
        columns={columns}
        data={users.data?.items}
        meta={users.data?.meta}
        isLoading={users.isLoading}
        isFetching={users.isFetching}
        error={users.error}
        onRetry={users.refetch}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
      />
      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Doctors who still have patients can't be deleted. Consultation history is kept."
        isPending={deleteUser.isPending}
        onConfirm={() =>
          deleting &&
          deleteUser.mutate(deleting._id, {
            onSuccess: () => { toast.success("User deleted"); setDeleting(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
