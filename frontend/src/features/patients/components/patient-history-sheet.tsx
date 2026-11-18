"use client";

import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/session-provider";
import { ConsultationHistory } from "@/features/consultations/components/consultation-history";
import { useConsultations } from "@/features/consultations/hooks";
import { usePatient } from "../hooks";
import { PatientSummary } from "./patient-summary";

/**
 * A patient's details and consultation timeline. Doctors see only their
 * own consultations with this patient (the backend enforces that too).
 */
export function PatientHistorySheet({
  patientId,
  onOpenChange,
}: {
  patientId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useSession();
  const isDoctor = user.userType === "DOCTOR";
  const patient = usePatient(patientId);
  const consultations = useConsultations({ patient: patientId ?? "", limit: 50 }, Boolean(patientId));

  return (
    <Sheet open={Boolean(patientId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{patient.data?.name ?? "Patient"}</SheetTitle>
          <SheetDescription>
            {isDoctor ? "Your visits with this patient." : "All consultations across doctors."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {patient.data ? <PatientSummary patient={patient.data} /> : <Skeleton className="h-32 w-full" />}

          {isDoctor && patientId && (
            <Button asChild className="w-full">
              <Link href={`/consultations/new?patient=${patientId}`}>
                <FilePlus2 /> Start consultation
              </Link>
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              Consultations {consultations.data && `(${consultations.data.meta.total})`}
            </h3>
            <ConsultationHistory
              consultations={consultations.data?.items}
              isLoading={consultations.isLoading}
              error={consultations.error}
              showDoctor={!isDoctor}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
