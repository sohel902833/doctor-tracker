import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PatientsPage } from "@/features/patients/components/patients-page";

export const metadata: Metadata = { title: "Patients" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PatientsPage />
    </Suspense>
  );
}
