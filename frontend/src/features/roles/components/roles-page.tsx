"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { DataTable } from "@/components/data-table/data-table";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { NoAccess } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan } from "@/features/auth/session-provider";
import { humanize } from "@/lib/format";
import type { Role } from "@/lib/models";
import { isSuperAdmin } from "@/lib/permissions";
import { useDeleteRole, useRoles } from "../hooks";
import { RoleFormDialog } from "./role-form-dialog";

const permissionSummary = (role: Role) => {
  if (isSuperAdmin(role.permissions)) return null;
  return Object.values(role.permissions).reduce(
    (sum, actions) => sum + Object.values(actions).filter(Boolean).length,
    0,
  );
};

export function RolesPage() {
  const canRead = useCan("role.read");
  const canUpdate = useCan("role.update");
  const canDelete = useCan("role.delete");
  const roles = useRoles();
  const deleteRole = useDeleteRole();

  const [editing, setEditing] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" /> {row.original.name}
          </div>
        ),
      },
      {
        header: "User type",
        cell: ({ row }) => <Badge variant="secondary">{humanize(row.original.userType)}</Badge>,
      },
      {
        header: "Permissions",
        cell: ({ row }) => {
          const count = permissionSummary(row.original);
          return count === null ? (
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">All permissions</Badge>
          ) : (
            <span className="text-muted-foreground">{count} permission{count === 1 ? "" : "s"}</span>
          );
        },
      },
      {
        header: "Subordinates",
        cell: ({ row }) =>
          row.original.subordinateRoles.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.subordinateRoles.map((r) => (
                <Badge key={r._id} variant="outline">{r.name}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
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
        title="Roles & permissions"
        description="Control what each role can see and do across the app."
        actions={
          <PermissionGate permission="role.create">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus /> Create role
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={roles.data}
        isLoading={roles.isLoading}
        error={roles.error}
        onRetry={roles.refetch}
      />

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Roles assigned to users can't be deleted. This can't be undone."
        isPending={deleteRole.isPending}
        onConfirm={() =>
          deleting &&
          deleteRole.mutate(deleting._id, {
            onSuccess: () => { toast.success("Role deleted"); setDeleting(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
