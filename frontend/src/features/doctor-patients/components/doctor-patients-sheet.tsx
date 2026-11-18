"use client";

import { Plus, UserMinus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCan } from "@/features/auth/session-provider";
import type { DoctorPatientRow, User } from "@/lib/models";
import { useRemoveDoctorPatient } from "../hooks";
import { AddPatientDialog } from "./add-patient-dialog";
import {
  DOCTOR_PATIENT_DEFAULTS,
  DoctorPatientsTable,
  type DoctorPatientFilters,
} from "./doctor-patients-table";

/** Admin view of one doctor's patients: add, remove, filter. */
export function DoctorPatientsSheet({
  doctor,
  onOpenChange,
}: {
  doctor: User | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(doctor)} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-4xl">
        {/* Keyed by doctor: switching doctors starts with fresh filters. */}
        {doctor && <DoctorPatientsPanel key={doctor._id} doctor={doctor} />}
      </SheetContent>
    </Sheet>
  );
}

function DoctorPatientsPanel({ doctor }: { doctor: User }) {
  const canCreate = useCan("patient.create");
  const canUpdate = useCan("patient.update");
  const [filters, setFiltersState] = useState<DoctorPatientFilters>(DOCTOR_PATIENT_DEFAULTS);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<DoctorPatientRow | null>(null);
  const remove = useRemoveDoctorPatient(doctor._id);

  const setFilters = (changes: Partial<DoctorPatientFilters>) =>
    setFiltersState((current) => ({ ...current, ...changes, ...(!("page" in changes) && { page: "1" }) }));

  const renderActions = useCallback(
    (row: DoctorPatientRow) => (
      <RowActions
        actions={[
          {
            label: "Remove from list",
            icon: UserMinus,
            destructive: true,
            hidden: !canUpdate || row.status !== "ACTIVE",
            onClick: () => setRemoving(row),
          },
        ]}
      />
    ),
    [canUpdate],
  );

  const addButton = canCreate && (
    <Button size="sm" onClick={() => setAddOpen(true)}>
      <Plus /> Add patient
    </Button>
  );

  return (
    <>
      <SheetHeader className="flex-row items-start justify-between gap-4 border-b pr-12">
        <div>
          <SheetTitle>{doctor.name}&apos;s patients</SheetTitle>
          <SheetDescription>
            {doctor.doctorProfile?.specialization ?? "Doctor"} · Patients added here have no visits until a consultation.
          </SheetDescription>
        </div>
        {addButton}
      </SheetHeader>

      <div className="p-4">
        <DoctorPatientsTable
          doctorId={doctor._id}
          filters={filters}
          setFilters={setFilters}
          renderActions={renderActions}
          emptyAction={addButton}
        />
      </div>

      <AddPatientDialog open={addOpen} onOpenChange={setAddOpen} doctorId={doctor._id} doctorName={doctor.name} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.patient.name}?`}
        description={`They will be removed from ${doctor.name}'s list. Their consultation history is kept.`}
        confirmLabel="Remove"
        isPending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.patient._id, {
            onSuccess: () => { toast.success("Patient removed from list"); setRemoving(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
