import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ConsultationDetail } from "@/features/consultations/components/consultation-detail";

export const metadata: Metadata = { title: "Prescription" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConsultationDetail />
    </Suspense>
  );
}
