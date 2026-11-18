"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors, SelectField, TextField, toOptions } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BLOOD_GROUPS, CONDITIONS, GENDERS, type Condition } from "@/lib/constants";
import { humanize, toDateInputValue } from "@/lib/format";
import type { Patient } from "@/lib/models";
import { useCreatePatient, useUpdatePatient } from "../hooks";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.union([z.literal(""), z.email("Email must be valid")]),
  dateOfBirth: z.string(),
  gender: z.string(),
  bloodGroup: z.string(),
  condition: z.string(),
});
type Values = z.infer<typeof schema>;

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}) {
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      form.reset({
        name: patient?.name ?? "",
        phone: patient?.phone ?? "",
        email: patient?.email ?? "",
        dateOfBirth: toDateInputValue(patient?.dateOfBirth),
        gender: patient?.gender ?? "",
        bloodGroup: patient?.bloodGroup ?? "",
        condition: patient?.patientProfile?.currentCondition ?? "",
      });
    }
  }, [open, patient, form]);

  const onSubmit = form.handleSubmit((values) => {
    const input = {
      name: values.name,
      phone: values.phone,
      email: orNull(values.email),
      dateOfBirth: orNull(values.dateOfBirth),
      gender: orNull(values.gender),
      bloodGroup: orNull(values.bloodGroup),
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(patient ? "Patient updated" : "Patient added");
        onOpenChange(false);
      },
      onError: (error: Error) => !applyServerErrors(form, error) && toast.error(error.message),
    };
    if (patient) {
      update.mutate(
        { id: patient._id, input: { ...input, condition: orNull(values.condition) as Condition | null } },
        callbacks,
      );
    } else {
      create.mutate(input, callbacks);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "Add patient"}</DialogTitle>
          <DialogDescription>Patients don&apos;t need an email or password.</DialogDescription>
        </DialogHeader>
        <form id="patient-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <TextField form={form} name="name" label="Full name" required className="sm:col-span-2" />
          <TextField form={form} name="phone" label="Phone" required placeholder="01711-000000" />
          <TextField form={form} name="email" label="Email" type="email" />
          <TextField form={form} name="dateOfBirth" label="Date of birth" type="date" />
          <SelectField form={form} name="gender" label="Gender" allowEmpty options={toOptions(GENDERS, humanize)} />
          <SelectField form={form} name="bloodGroup" label="Blood group" allowEmpty options={toOptions(BLOOD_GROUPS)} />
          {patient && (
            <SelectField form={form} name="condition" label="Current condition" allowEmpty options={toOptions(CONDITIONS, humanize)} />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="patient-form" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {patient ? "Save changes" : "Add patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
