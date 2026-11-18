"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Pill, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { DataTable } from "@/components/data-table/data-table";
import { FilterBar, FilterSelect, SearchInput } from "@/components/data-table/filters";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/components/feedback/permission-gate";
import { NoAccess } from "@/components/feedback/states";
import { toOptions } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/features/auth/session-provider";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { FORM_GROUPS, MEDICINE_TYPES } from "@/lib/constants";
import { formatPrice, humanize } from "@/lib/format";
import type { Generic, Medicine } from "@/lib/models";
import {
  useDeleteGeneric,
  useDeleteMedicine,
  useGenerics,
  useManufacturers,
  useMedicines,
} from "../hooks";
import { GenericFormDialog, MedicineFormDialog } from "./medicine-dialogs";

const DEFAULTS = { tab: "medicines", page: "1", limit: "10", search: "", formGroup: "", type: "", manufacturer: "" };

export function MedicinesPage() {
  const canRead = useCan("medicine.read");
  const canUpdate = useCan("medicine.update");
  const canDelete = useCan("medicine.delete");
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const onGenerics = filters.tab === "generics";

  const manufacturers = useManufacturers();
  const medicines = useMedicines(
    { page: filters.page, limit: filters.limit, search: filters.search, formGroup: filters.formGroup, type: filters.type, manufacturer: filters.manufacturer },
    !onGenerics,
  );
  const generics = useGenerics({ page: filters.page, limit: filters.limit, search: filters.search }, onGenerics);
  const deleteMedicine = useDeleteMedicine();
  const deleteGeneric = useDeleteGeneric();

  const [medicineForm, setMedicineForm] = useState<{ open: boolean; medicine: Medicine | null }>({ open: false, medicine: null });
  const [genericForm, setGenericForm] = useState<{ open: boolean; generic: Generic | null }>({ open: false, generic: null });
  const [deleting, setDeleting] = useState<{ kind: "medicine" | "generic"; id: string; name: string } | null>(null);

  const medicineColumns = useMemo<ColumnDef<Medicine, unknown>[]>(
    () => [
      {
        header: "Brand",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Pill className="size-4" /></div>
            <div>
              <p className="font-medium">{row.original.name} <span className="text-muted-foreground">{row.original.strength}</span></p>
              <p className="text-xs text-muted-foreground">{row.original.dosageForm}</p>
            </div>
          </div>
        ),
      },
      { header: "Generic", cell: ({ row }) => <span className="line-clamp-2 max-w-56">{row.original.genericName ?? "—"}</span> },
      { header: "Form", cell: ({ row }) => <Badge variant="secondary">{humanize(row.original.formGroup)}</Badge> },
      { header: "Manufacturer", cell: ({ row }) => <span className="line-clamp-1 max-w-48">{row.original.manufacturer ?? "—"}</span> },
      { header: "Price", cell: ({ row }) => <span className="tabular-nums">{formatPrice(row.original.priceBdt)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: "Edit", icon: Pencil, hidden: !canUpdate, onClick: () => setMedicineForm({ open: true, medicine: row.original }) },
              { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, onClick: () => setDeleting({ kind: "medicine", id: row.original._id, name: row.original.name }) },
            ]}
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

  const genericColumns = useMemo<ColumnDef<Generic, unknown>[]>(
    () => [
      { header: "Generic", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { header: "Drug class", cell: ({ row }) => <span className="line-clamp-2 max-w-64">{row.original.drugClass ?? "—"}</span> },
      { header: "Indication", cell: ({ row }) => <span className="line-clamp-2 max-w-md text-muted-foreground">{row.original.indication ?? "—"}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: "Edit", icon: Pencil, hidden: !canUpdate, onClick: () => setGenericForm({ open: true, generic: row.original }) },
              { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, onClick: () => setDeleting({ kind: "generic", id: row.original._id, name: row.original.name }) },
            ]}
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

  if (!canRead) return <NoAccess />;

  const confirmDelete = () => {
    if (!deleting) return;
    const mutation = deleting.kind === "medicine" ? deleteMedicine : deleteGeneric;
    mutation.mutate(deleting.id, {
      onSuccess: () => { toast.success(`${humanize(deleting.kind)} deleted`); setDeleting(null); },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <>
      <PageHeader
        title="Medicine catalog"
        description="Brands and generics doctors prescribe from."
        actions={
          <PermissionGate permission="medicine.create">
            <Button onClick={() => (onGenerics ? setGenericForm({ open: true, generic: null }) : setMedicineForm({ open: true, medicine: null }))}>
              <Plus /> Add {onGenerics ? "generic" : "medicine"}
            </Button>
          </PermissionGate>
        }
      />

      <Tabs value={filters.tab} onValueChange={(tab) => setFilters({ ...DEFAULTS, tab })}>
        <TabsList>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="generics">Generics</TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterBar onReset={() => setFilters({ ...DEFAULTS, tab: filters.tab })}>
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters({ search })}
          placeholder={onGenerics ? "Generic name starts with…" : "Brand or generic starts with…"}
        />
        {!onGenerics && (
          <>
            <FilterSelect value={filters.formGroup} onChange={(formGroup) => setFilters({ formGroup })} placeholder="Forms" options={toOptions(FORM_GROUPS, humanize)} />
            <FilterSelect value={filters.type} onChange={(type) => setFilters({ type })} placeholder="Types" options={toOptions(MEDICINE_TYPES, humanize)} />
            <FilterSelect
              value={filters.manufacturer}
              onChange={(manufacturer) => setFilters({ manufacturer })}
              placeholder="Manufacturers"
              className="md:w-56"
              options={toOptions(manufacturers.data ?? [])}
            />
          </>
        )}
      </FilterBar>

      {onGenerics ? (
        <DataTable
          columns={genericColumns}
          data={generics.data?.items}
          meta={generics.data?.meta}
          isLoading={generics.isLoading}
          isFetching={generics.isFetching}
          error={generics.error}
          onRetry={generics.refetch}
          onPageChange={(page) => setFilters({ page: String(page) })}
          onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        />
      ) : (
        <DataTable
          columns={medicineColumns}
          data={medicines.data?.items}
          meta={medicines.data?.meta}
          isLoading={medicines.isLoading}
          isFetching={medicines.isFetching}
          error={medicines.error}
          onRetry={medicines.refetch}
          onPageChange={(page) => setFilters({ page: String(page) })}
          onLimitChange={(limit) => setFilters({ limit: String(limit) })}
        />
      )}

      <MedicineFormDialog open={medicineForm.open} onOpenChange={(open) => setMedicineForm((s) => ({ ...s, open }))} medicine={medicineForm.medicine} />
      <GenericFormDialog open={genericForm.open} onOpenChange={(open) => setGenericForm((s) => ({ ...s, open }))} generic={genericForm.generic} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={deleting?.kind === "generic" ? "Generics used by brands can't be deleted." : "Past prescriptions keep their copy of this medicine."}
        isPending={deleteMedicine.isPending || deleteGeneric.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
