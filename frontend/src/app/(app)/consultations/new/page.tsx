import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ConsultationForm } from "@/features/consultations/components/consultation-form";

export const metadata: Metadata = { title: "New consultation" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConsultationForm />
    </Suspense>
  );
}
