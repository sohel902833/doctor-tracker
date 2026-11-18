import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { MedicinesPage } from "@/features/medicines/components/medicines-page";

export const metadata: Metadata = { title: "Medicines" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MedicinesPage />
    </Suspense>
  );
}
