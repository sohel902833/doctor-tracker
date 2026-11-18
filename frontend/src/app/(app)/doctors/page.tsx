import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { DoctorsPage } from "@/features/doctors/components/doctors-page";

export const metadata: Metadata = { title: "Doctors" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DoctorsPage />
    </Suspense>
  );
}
