"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ErrorState } from "@/components/feedback/states";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useConsultation } from "../hooks";
import { fromConsultation } from "../prescription";
import { PrescriptionActions } from "./prescription-actions";
import { PrescriptionView } from "./prescription-view";

/** A saved consultation, exactly as issued, ready to reprint. */
export function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const consultation = useConsultation(id);
  const data = useMemo(() => (consultation.data ? fromConsultation(consultation.data) : null), [consultation.data]);

  if (consultation.isLoading) return <PageSkeleton />;
  if (consultation.error || !consultation.data || !data) {
    return <ErrorState message={consultation.error?.message ?? "Consultation not found"} onRetry={consultation.refetch} />;
  }

  const c = consultation.data;
  return (
    <>
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/consultations"><ArrowLeft /> Consultations</Link>
        </Button>
        <PageHeader
          title={`Prescription ${c.prescriptionNo}`}
          description={`${c.patientSnapshot.name} · visit #${c.visitNumber} · ${formatDateTime(c.visitedAt)}`}
          actions={<PrescriptionActions data={data} />}
        />
      </div>
      <div className="mx-auto max-w-3xl">
        <PrescriptionView data={data} id="print-area" />
      </div>
    </>
  );
}
