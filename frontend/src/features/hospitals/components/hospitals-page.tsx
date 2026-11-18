"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { RowActions } from "@/components/common/row-actions";
import { DataTable } from "@/components/data-table/data-table";
import { FilterBar, SearchInput } from "@/components/data-table/filters";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { NoAccess } from "@/components/feedback/states";
import { applyServerErrors, emptyToNull, TextAreaField, TextField } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCan } from "@/features/auth/session-provider";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatDate } from "@/lib/format";
import type { Hospital } from "@/lib/models";
import { useDeleteHospital, useHospitals, useSaveHospital } from "../hooks";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(""), z.email("Email must be valid")]),
});
type Values = z.infer<typeof schema>;

function HospitalFormDialog({
  open,
  onOpenChange,
  hospital,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital: Hospital | null;
}) {
  const save = useSaveHospital();
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      form.reset({
        name: hospital?.name ?? "",
        address: hospital?.address ?? "",
        phone: hospital?.phone ?? "",
        email: hospital?.email ?? "",
      });
    }
  }, [open, hospital, form]);

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      { id: hospital?._id, input: { ...emptyToNull(values), name: values.name } },
      {
        onSuccess: () => {
          toast.success(hospital ? "Hospital updated" : "Hospital created");
          onOpenChange(false);
        },
        onError: (error) => !applyServerErrors(form, error) && toast.error(error.message),
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{hospital ? "Edit hospital" : "Add hospital"}</DialogTitle>
          <DialogDescription>Doctors can be linked to hospitals from their profile.</DialogDescription>
        </DialogHeader>
        <form id="hospital-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <TextField form={form} name="name" label="Name" required placeholder="Square Hospital" />
          <TextAreaField form={form} name="address" label="Address" rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="phone" label="Phone" />
            <TextField form={form} name="email" label="Email" type="email" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="hospital-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {hospital ? "Save changes" : "Add hospital"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HospitalsPage() {
  const canRead = useCan("hospital.read");
  const canUpdate = useCan("hospital.update");
  const canDelete = useCan("hospital.delete");
  const [filters, setFilters] = useUrlFilters({ page: "1", limit: "10", search: "" });
  const hospitals = useHospitals({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
  });
  const deleteHospital = useDeleteHospital();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [deleting, setDeleting] = useState<Hospital | null>(null);

  const columns = useMemo<ColumnDef<Hospital, unknown>[]>(
    () => [
      {
        header: "Hospital",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="size-4" /></div>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="max-w-xs truncate text-xs text-muted-foreground">{row.original.address ?? "No address"}</p>
            </div>
          </div>
        ),
      },
      { header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      { header: "Email", cell: ({ row }) => row.original.email ?? "—" },
      { header: "Added", cell: ({ row }) => formatDate(row.original.createdAt) },
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
        title="Hospitals"
        description="Hospitals doctors work at."
        actions={
          <PermissionGate permission="hospital.create">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Add hospital</Button>
          </PermissionGate>
        }
      />
      <FilterBar>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Search name or address…" />
      </FilterBar>
      <DataTable
        columns={columns}
        data={hospitals.data?.items}
        meta={hospitals.data?.meta}
        isLoading={hospitals.isLoading}
        isFetching={hospitals.isFetching}
        error={hospitals.error}
        onRetry={hospitals.refetch}
        onPageChange={(page) => setFilters({ page: String(page) })}
        onLimitChange={(limit) => setFilters({ limit: String(limit) })}
      />
      <HospitalFormDialog open={formOpen} onOpenChange={setFormOpen} hospital={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Hospitals linked to doctors can't be deleted."
        isPending={deleteHospital.isPending}
        onConfirm={() =>
          deleting &&
          deleteHospital.mutate(deleting._id, {
            onSuccess: () => { toast.success("Hospital deleted"); setDeleting(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}

