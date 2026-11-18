import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ConsultationsPage } from "@/features/consultations/components/consultations-page";

export const metadata: Metadata = { title: "Consultations" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConsultationsPage />
    </Suspense>
  );
}
