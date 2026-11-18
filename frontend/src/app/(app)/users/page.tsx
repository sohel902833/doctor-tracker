import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { UsersPage } from "@/features/users/components/users-page";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UsersPage />
    </Suspense>
  );
}
