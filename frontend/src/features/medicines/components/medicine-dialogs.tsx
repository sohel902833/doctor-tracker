"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AsyncCombobox } from "@/components/form/async-combobox";
import { applyServerErrors, Field, SelectField, TextAreaField, TextField, toOptions } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MEDICINE_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { Generic, Medicine } from "@/lib/models";
import { searchGenerics } from "../api";
import { useSaveGeneric, useSaveMedicine } from "../hooks";

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

// ---------- Medicine ----------

const medicineSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required"),
  genericId: z.string(),
  dosageForm: z.string().trim().min(1, "Dosage form is required"),
  strength: z.string(),
  manufacturer: z.string(),
  type: z.enum(MEDICINE_TYPES),
  priceBdt: z.string().refine((v) => v === "" || Number(v) >= 0, "Price must be a positive number"),
  packageInfo: z.string(),
  isActive: z.boolean(),
});
type MedicineValues = z.infer<typeof medicineSchema>;

type MedicineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
};

const toMedicineValues = (medicine: Medicine | null): MedicineValues => ({
  name: medicine?.name ?? "",
  genericId: (typeof medicine?.generic === "string" ? medicine.generic : medicine?.generic?._id) ?? "",
  dosageForm: medicine?.dosageForm ?? "Tablet",
  strength: medicine?.strength ?? "",
  manufacturer: medicine?.manufacturer ?? "",
  type: medicine?.type ?? "ALLOPATHIC",
  priceBdt: medicine?.priceBdt != null ? String(medicine.priceBdt) : "",
  packageInfo: medicine?.packageInfo ?? "",
  isActive: medicine?.isActive ?? true,
});

// Mounted only while open, so the form always starts from `medicine`.
export function MedicineFormDialog(props: MedicineDialogProps) {
  return props.open ? <MedicineFormDialogContent {...props} /> : null;
}

function MedicineFormDialogContent({ open, onOpenChange, medicine }: MedicineDialogProps) {
  const save = useSaveMedicine();
  const form = useForm<MedicineValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: toMedicineValues(medicine),
  });
  const [genericLabel, setGenericLabel] = useState<string | null>(medicine?.genericName ?? null);

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      {
        id: medicine?._id,
        input: {
          name: values.name,
          genericId: values.genericId || null,
          dosageForm: values.dosageForm,
          strength: orNull(values.strength),
          manufacturer: orNull(values.manufacturer),
          type: values.type,
          priceBdt: values.priceBdt === "" ? null : Number(values.priceBdt),
          packageInfo: orNull(values.packageInfo),
          isActive: values.isActive,
        },
      },
      {
        onSuccess: () => { toast.success(medicine ? "Medicine updated" : "Medicine added"); onOpenChange(false); },
        onError: (error) => !applyServerErrors(form, error) && toast.error(error.message),
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit medicine" : "Add medicine"}</DialogTitle>
          <DialogDescription>Brands appear in the doctor&apos;s medicine picker.</DialogDescription>
        </DialogHeader>
        <form id="medicine-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <TextField form={form} name="name" label="Brand name" required placeholder="Napa" />
          <Field label="Generic" error={form.formState.errors.genericId?.message}>
            <Controller
              control={form.control}
              name="genericId"
              render={({ field }) => (
                <AsyncCombobox<Generic>
                  queryKey="generics"
                  fetchOptions={searchGenerics}
                  value={field.value}
                  selectedLabel={genericLabel}
                  placeholder="Search generic…"
                  onSelect={(generic) => { field.onChange(generic?._id ?? ""); setGenericLabel(generic?.name ?? null); }}
                  renderOption={(g) => (
                    <div className="min-w-0">
                      <p className="truncate">{g.name}</p>
                      {g.drugClass && <p className="truncate text-xs text-muted-foreground">{g.drugClass}</p>}
                    </div>
                  )}
                />
              )}
            />
          </Field>
          <TextField form={form} name="dosageForm" label="Dosage form" required placeholder="Tablet (Extended Release)" />
          <TextField form={form} name="strength" label="Strength" placeholder="500 mg" />
          <TextField form={form} name="manufacturer" label="Manufacturer" />
          <SelectField form={form} name="type" label="Type" options={toOptions(MEDICINE_TYPES, humanize)} />
          <TextField form={form} name="priceBdt" label="Unit price (BDT)" type="text" inputMode="decimal" />
          <TextAreaField form={form} name="packageInfo" label="Package info" rows={2} className="sm:col-span-2" />
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Available</p>
              <p className="text-xs text-muted-foreground">Unavailable medicines are hidden from the picker.</p>
            </div>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Available" />}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="medicine-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {medicine ? "Save changes" : "Add medicine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Generic ----------

const genericSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  drugClass: z.string(),
  indication: z.string(),
});
type GenericValues = z.infer<typeof genericSchema>;

export function GenericFormDialog({
  open,
  onOpenChange,
  generic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generic: Generic | null;
}) {
  const save = useSaveGeneric();
  const form = useForm<GenericValues>({ resolver: zodResolver(genericSchema) });

  useEffect(() => {
    if (open) form.reset({ name: generic?.name ?? "", drugClass: generic?.drugClass ?? "", indication: generic?.indication ?? "" });
  }, [open, generic, form]);

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      { id: generic?._id, input: { name: values.name, drugClass: orNull(values.drugClass), indication: orNull(values.indication) } },
      {
        onSuccess: () => { toast.success(generic ? "Generic updated" : "Generic added"); onOpenChange(false); },
        onError: (error) => !applyServerErrors(form, error) && toast.error(error.message),
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{generic ? "Edit generic" : "Add generic"}</DialogTitle>
          <DialogDescription>Renaming a generic updates all its brands.</DialogDescription>
        </DialogHeader>
        <form id="generic-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <TextField form={form} name="name" label="Name" required placeholder="Amlodipine" />
          <TextField form={form} name="drugClass" label="Drug class" placeholder="Calcium-channel blockers" />
          <TextAreaField form={form} name="indication" label="Indication" rows={3} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="generic-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {generic ? "Save changes" : "Add generic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
