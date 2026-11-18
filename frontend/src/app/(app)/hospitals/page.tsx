import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { HospitalsPage } from "@/features/hospitals/components/hospitals-page";

export const metadata: Metadata = { title: "Hospitals" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HospitalsPage />
    </Suspense>
  );
}
