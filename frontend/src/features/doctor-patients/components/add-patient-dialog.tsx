"use client";

import { CheckCircle2, Loader2, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatientLookup } from "@/features/patients/hooks";
import { ApiError } from "@/lib/api/client";
import { BLOOD_GROUPS, GENDERS } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { DoctorRef } from "../api";
import { useAddDoctorPatient } from "../hooks";

type NewPatient = { name: string; age: string; gender: string; bloodGroup: string };
const EMPTY: NewPatient = { name: "", age: "", gender: "", bloodGroup: "" };

/**
 * Admin adds a patient to a doctor's list. Type a phone: an existing
 * patient is found and linked; otherwise a new patient is created.
 * No visit is recorded, so visit stats start empty.
 */
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: DoctorRef;
  doctorName: string;
};

// Mounted only while open, so every opening starts with a clean form.
export function AddPatientDialog(props: Props) {
  return props.open ? <AddPatientDialogContent {...props} /> : null;
}

function AddPatientDialogContent({ open, onOpenChange, doctorId, doctorName }: Props) {
  const [phone, setPhone] = useState("");
  const [newPatient, setNewPatient] = useState<NewPatient>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lookup = usePatientLookup(phone);
  const add = useAddDoctorPatient(doctorId);

  const found = lookup.data?.patient;
  const lookupError = lookup.error instanceof ApiError ? lookup.error.fieldErrors.phone ?? lookup.error.message : null;
  const isNew = lookup.enabled && lookup.isSuccess && !found;

  const submit = () => {
    const onError = (error: Error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(
          Object.fromEntries(
            Object.entries(error.fieldErrors).map(([key, message]) => [key.replace(/^patient\./, ""), message]),
          ),
        );
      } else toast.error(error.message);
    };
    const onSuccess = () => {
      toast.success(`Added to ${doctorName}'s patients`);
      onOpenChange(false);
    };

    if (found) return add.mutate({ patientId: found._id }, { onSuccess, onError });

    if (!newPatient.name.trim()) return setErrors({ name: "Name is required" });
    add.mutate(
      {
        patient: {
          name: newPatient.name.trim(),
          phone: lookup.phone,
          ...(newPatient.age && { age: Number(newPatient.age) }),
          gender: newPatient.gender || null,
          bloodGroup: newPatient.bloodGroup || null,
        },
      },
      { onSuccess, onError },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add patient</DialogTitle>
          <DialogDescription>Add a patient to {doctorName}&apos;s list. Start with their phone number.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Phone" htmlFor="lookup-phone" error={lookupError ?? errors.phone} required>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lookup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01711-000000"
                className="pl-8"
                autoFocus
              />
              {lookup.isFetching && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
          </Field>

          {found && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">{found.name}</p>
                <p className="text-muted-foreground">
                  {[found.age != null && `${found.age} yrs`, found.gender && humanize(found.gender), found.bloodGroup]
                    .filter(Boolean)
                    .join(" · ") || "Existing patient"}
                </p>
              </div>
            </div>
          )}

          {isNew && (
            <div className="grid gap-3 rounded-lg border p-3">
              <p className="flex items-center gap-2 text-sm font-medium"><UserPlus className="size-4" /> New patient</p>
              <Field label="Full name" htmlFor="np-name" error={errors.name} required>
                <Input id="np-name" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Age" htmlFor="np-age" error={errors.age}>
                  <Input id="np-age" type="number" min={0} max={130} value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} />
                </Field>
                <Field label="Gender">
                  <Select value={newPatient.gender} onValueChange={(gender) => setNewPatient({ ...newPatient, gender })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{humanize(g)}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Blood">
                  <Select value={newPatient.bloodGroup} onValueChange={(bloodGroup) => setNewPatient({ ...newPatient, bloodGroup })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={add.isPending || (!found && !isNew)}>
            {add.isPending && <Loader2 className="animate-spin" />}
            {found ? "Add to list" : "Create & add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
