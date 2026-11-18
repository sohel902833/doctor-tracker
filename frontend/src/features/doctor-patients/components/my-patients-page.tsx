"use client";

import { FilePlus2, History, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { NoAccess } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useCan, useSession } from "@/features/auth/session-provider";
import { PatientHistorySheet } from "@/features/patients/components/patient-history-sheet";
import { useUrlFilters } from "@/hooks/use-url-filters";
import type { DoctorPatientRow } from "@/lib/models";
import { useRemoveDoctorPatient } from "../hooks";
import { DOCTOR_PATIENT_DEFAULTS, DoctorPatientsTable } from "./doctor-patients-table";

/** The logged-in doctor's own patient list. */
export function MyPatientsPage() {
  const user = useSession();
  const canRead = useCan("patient.read");
  const canUpdate = useCan("patient.update");
  const canConsult = useCan("consultation.create");
  const router = useRouter();
  const [filters, setFilters] = useUrlFilters(DOCTOR_PATIENT_DEFAULTS);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DoctorPatientRow | null>(null);
  const remove = useRemoveDoctorPatient("me");

  const renderActions = useCallback(
    (row: DoctorPatientRow) => (
      <RowActions
        actions={[
          { label: "Start consultation", icon: FilePlus2, hidden: !canConsult, onClick: () => router.push(`/consultations/new?patient=${row.patient._id}`) },
          { label: "History", icon: History, onClick: () => setHistoryFor(row.patient._id) },
          { label: "Remove from my list", icon: UserMinus, destructive: true, hidden: !canUpdate || row.status !== "ACTIVE", onClick: () => setRemoving(row) },
        ]}
      />
    ),
    [canConsult, canUpdate, router],
  );

  if (!canRead || user.userType !== "DOCTOR") return <NoAccess />;

  return (
    <>
      <PageHeader
        title="My patients"
        description="Everyone you've seen or been assigned, with their latest visit."
        actions={
          canConsult && (
            <Button asChild>
              <Link href="/consultations/new"><FilePlus2 /> New consultation</Link>
            </Button>
          )
        }
      />
      <DoctorPatientsTable
        doctorId="me"
        filters={filters}
        setFilters={setFilters}
        renderActions={renderActions}
        onRowClick={(row) => setHistoryFor(row.patient._id)}
      />
      <PatientHistorySheet patientId={historyFor} onOpenChange={(open) => !open && setHistoryFor(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.patient.name} from your list?`}
        description="Their consultation history is kept. A new consultation adds them back."
        confirmLabel="Remove"
        isPending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.patient._id, {
            onSuccess: () => { toast.success("Removed from your list"); setRemoving(null); },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </>
  );
}
