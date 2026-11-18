"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, FilePlus2, Pill, Stethoscope, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ConditionBadge } from "@/components/common/condition-badge";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan, useSession } from "@/features/auth/session-provider";
import { useConsultations } from "@/features/consultations/hooks";
import { api } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import type { PermissionKey } from "@/lib/permissions";

type Stat = { label: string; path: string; params?: Record<string, string>; icon: LucideIcon; href: string; permission: PermissionKey };

/** Totals from each list's pagination meta (limit=1). Full analytics come later. */
function StatCard({ stat }: { stat: Stat }) {
  const allowed = useCan(stat.permission);
  const total = useQuery({
    queryKey: ["dashboard", stat.path, stat.params],
    queryFn: async () => (await api.get<Paginated<unknown>>(stat.path, { ...stat.params, limit: 1 })).meta.total,
    enabled: allowed,
  });
  if (!allowed) return null;

  return (
    <Link href={stat.href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {total.data === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">{total.data.toLocaleString()}</p>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <stat.icon className="size-5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  const user = useSession();
  const isDoctor = user.userType === "DOCTOR";
  const canSeeConsultations = useCan("consultation.read");
  const recent = useConsultations({ limit: 5 }, canSeeConsultations);

  const stats: Stat[] = isDoctor
    ? [
        { label: "My patients", path: "/doctors/me/patients", icon: UsersRound, href: "/my-patients", permission: "patient.read" },
        { label: "My consultations", path: "/consultations", icon: ClipboardList, href: "/consultations", permission: "consultation.read" },
        { label: "Medicines in catalog", path: "/medicines", icon: Pill, href: "/medicines", permission: "medicine.read" },
      ]
    : [
        { label: "Doctors", path: "/users", params: { userType: "DOCTOR" }, icon: Stethoscope, href: "/doctors", permission: "user.read" },
        { label: "Patients", path: "/patients", icon: UsersRound, href: "/patients", permission: "patient.read" },
        { label: "Consultations", path: "/consultations", icon: ClipboardList, href: "/consultations", permission: "consultation.read" },
        { label: "Medicines", path: "/medicines", icon: Pill, href: "/medicines", permission: "medicine.read" },
      ];

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description={isDoctor ? "Here's your practice at a glance." : "Here's what's happening across the clinic."}
        actions={
          isDoctor && (
            <Button asChild><Link href="/consultations/new"><FilePlus2 /> New consultation</Link></Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
      </div>

      {canSeeConsultations && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent consultations</CardTitle>
              <CardDescription>The latest visits{isDoctor ? " you recorded" : ""}.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/consultations">View all <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !recent.data?.items.length ? (
              <EmptyState title="No consultations yet" />
            ) : (
              <ul className="divide-y">
                {recent.data.items.map((c) => (
                  <li key={c._id}>
                    <Link href={`/consultations/${c._id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.patientSnapshot.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.prescriptionNo} · {formatDateTime(c.visitedAt)}{!isDoctor && ` · ${c.doctorSnapshot.name}`}
                        </p>
                      </div>
                      <ConditionBadge condition={c.condition} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
