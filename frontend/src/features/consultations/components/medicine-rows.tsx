"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { AsyncCombobox } from "@/components/form/async-combobox";
import { Field } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchMedicines } from "@/features/medicines/api";
import { MEAL_TIMING_LABELS, MEAL_TIMINGS } from "@/lib/constants";
import type { Medicine } from "@/lib/models";
import type { ConsultationFormValues } from "./consultation-form";

export const NEW_MEDICINE_ROW: ConsultationFormValues["medicines"][number] = {
  medicineId: "",
  name: "",
  strength: "",
  genericName: "",
  dosageForm: "",
  dose: "1 tab",
  morning: 1,
  noon: 0,
  night: 1,
  mealTiming: "AFTER_MEAL",
  durationDays: 7,
  instructions: "",
};

const DURATION_PRESETS = [5, 7, 14, 30];

export function MedicineRows({ form }: { form: UseFormReturn<ConsultationFormValues> }) {
  const rows = useFieldArray({ control: form.control, name: "medicines" });
  const errors = form.formState.errors.medicines;

  return (
    <div className="space-y-3">
      {rows.fields.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No medicines yet. Add one below.
        </p>
      )}

      {rows.fields.map((row, index) => {
        const rowErrors = errors?.[index];
        return (
          <div key={row.id} className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-6">
            <Field label={`Medicine ${index + 1}`} error={rowErrors?.name?.message} className="sm:col-span-6">
              <Controller
                control={form.control}
                name={`medicines.${index}.medicineId`}
                render={({ field }) => {
                  const values = form.getValues(`medicines.${index}`);
                  return (
                    <AsyncCombobox<Medicine>
                      queryKey="medicines"
                      fetchOptions={searchMedicines}
                      value={field.value}
                      selectedLabel={[values.name, values.strength, values.dosageForm && `· ${values.dosageForm}`].filter(Boolean).join(" ")}
                      placeholder="Search brand or generic…"
                      searchPlaceholder="e.g. Napa, Amlodipine…"
                      allowCustom
                      invalid={Boolean(rowErrors?.name)}
                      onSelect={(medicine, customText) => {
                        field.onChange(medicine?._id ?? "");
                        form.setValue(`medicines.${index}.name`, medicine?.name ?? customText ?? "", { shouldValidate: true, shouldDirty: true });
                        form.setValue(`medicines.${index}.strength`, medicine?.strength ?? "");
                        form.setValue(`medicines.${index}.genericName`, medicine?.genericName ?? "");
                        form.setValue(`medicines.${index}.dosageForm`, medicine?.dosageForm ?? "");
                      }}
                      renderOption={(m) => (
                        <div className="min-w-0">
                          <p className="truncate">
                            <span className="font-medium">{m.name}</span> {m.strength} <span className="text-muted-foreground">· {m.dosageForm}</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.genericName} {m.manufacturer && `· ${m.manufacturer}`}</p>
                        </div>
                      )}
                    />
                  );
                }}
              />
            </Field>

            <Field label="Dose" error={rowErrors?.dose?.message} className="sm:col-span-2">
              <Input {...form.register(`medicines.${index}.dose`)} placeholder="1 tab" aria-invalid={Boolean(rowErrors?.dose)} />
            </Field>

            <Field label="Morning + noon + night" error={rowErrors?.morning?.message ?? rowErrors?.noon?.message ?? rowErrors?.night?.message} className="sm:col-span-2">
              <div className="flex items-center gap-1">
                {(["morning", "noon", "night"] as const).map((part, i) => (
                  <div key={part} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground">+</span>}
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-14 text-center"
                      aria-label={part}
                      {...form.register(`medicines.${index}.${part}`, { valueAsNumber: true })}
                    />
                  </div>
                ))}
              </div>
            </Field>

            <Field label="Meal" className="sm:col-span-2">
              <Controller
                control={form.control}
                name={`medicines.${index}.mealTiming`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_TIMINGS.map((timing) => (
                        <SelectItem key={timing} value={timing}>{MEAL_TIMING_LABELS[timing]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Days" error={rowErrors?.durationDays?.message} className="sm:col-span-3">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="w-20"
                  aria-invalid={Boolean(rowErrors?.durationDays)}
                  {...form.register(`medicines.${index}.durationDays`, { valueAsNumber: true })}
                />
                {DURATION_PRESETS.map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => form.setValue(`medicines.${index}.durationDays`, days, { shouldValidate: true, shouldDirty: true })}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </Field>

            <Field label="Instructions" className="sm:col-span-3">
              <Input {...form.register(`medicines.${index}.instructions`)} placeholder="Optional" />
            </Field>

            <div className="flex justify-end sm:col-span-6">
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => rows.remove(index)}>
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => rows.append({ ...NEW_MEDICINE_ROW })}>
        <Plus /> Add medicine
      </Button>
    </div>
  );
}
