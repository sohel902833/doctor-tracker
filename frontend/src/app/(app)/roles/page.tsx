import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { RolesPage } from "@/features/roles/components/roles-page";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RolesPage />
    </Suspense>
  );
}
