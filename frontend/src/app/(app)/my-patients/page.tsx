import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { MyPatientsPage } from "@/features/doctor-patients/components/my-patients-page";

export const metadata: Metadata = { title: "My patients" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyPatientsPage />
    </Suspense>
  );
}
