"use client";

import { ClipboardList, FilePlus2, Stethoscope, UserPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { ConditionBadge } from "@/components/common/condition-badge";
import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/session-provider";
import { useUrlFilters } from "@/hooks/use-url-filters";
import type { Condition } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, useDashboard, type RangePreset } from "../api";
import { BreakdownBars } from "./breakdown-bars";
import { StatTile } from "./stat-tile";
import { ConsultationTrendChart, NewPatientsChart } from "./trend-charts";

// Conditions are states, so they use the status colors (always with a text label).
const CONDITION_COLORS: Record<Condition, string> = {
  CRITICAL: "var(--status-critical)",
  UNDER_TREATMENT: "var(--status-warning)",
  STABLE: "var(--status-good)",
  RECOVERED: "var(--series-1)",
};
const CONDITION_ORDER: Condition[] = ["CRITICAL", "UNDER_TREATMENT", "STABLE", "RECOVERED"];

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function DashboardPage() {
  const user = useSession();
  const isDoctor = user.userType === "DOCTOR";
  const [filters, setFilters] = useUrlFilters({ range: "30d" });
  const preset = (filters.range in RANGE_PRESETS ? filters.range : "30d") as RangePreset;
  const dashboard = useDashboard(preset);
  const d = dashboard.data;

  const conditionRows = (rows: { condition: Condition | null; count: number }[] = []) =>
    CONDITION_ORDER.flatMap((condition) => {
      const row = rows.find((r) => r.condition === condition);
      return row?.count
        ? [{ key: condition, label: <ConditionBadge condition={condition} />, title: condition, value: row.count, color: CONDITION_COLORS[condition] }]
        : [];
    });

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.replace(/^Dr\.?\s+/i, "").split(" ")[0]}`}
        description={isDoctor ? "Your practice at a glance." : "What's happening across the clinic."}
        actions={
          <>
            <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Date range">
              {(Object.keys(RANGE_PRESETS) as RangePreset[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={preset === key ? "secondary" : "ghost"}
                  aria-pressed={preset === key}
                  onClick={() => setFilters({ range: key })}
                >
                  {RANGE_PRESETS[key].label}
                </Button>
              ))}
            </div>
            {isDoctor && (
              <Button asChild>
                <Link href="/consultations/new"><FilePlus2 /> New consultation</Link>
              </Button>
            )}
          </>
        }
      />

      {dashboard.error ? (
        <ErrorState message={dashboard.error.message} onRetry={dashboard.refetch} />
      ) : (
        <div className={cn("space-y-6 transition-opacity", dashboard.isFetching && d && "opacity-70")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!isDoctor && (
              <StatTile label="Doctors" value={d?.totals.doctors ?? undefined} icon={Stethoscope} detail="Registered in the clinic" />
            )}
            <StatTile
              label={isDoctor ? "My patients" : "Patients"}
              value={d?.totals.patients}
              icon={UsersRound}
              detail={isDoctor ? "On your active list" : "All registered patients"}
            />
            <StatTile
              label="Consultations"
              value={d?.period.consultations}
              icon={ClipboardList}
              detail={d && `${percent(d.period.followUps, d.period.consultations)}% follow-ups · ${d.totals.consultations.toLocaleString()} all time`}
            />
            <StatTile
              label="Patients seen"
              value={d?.period.patientsSeen}
              icon={UserPlus}
              detail={d && `${d.period.newPatients.toLocaleString()} ${isDoctor ? "first visits" : "new patients"} in this period`}
            />
          </div>

          {d ? (
            <>
              <div className="grid gap-4 xl:grid-cols-5">
                <div className="xl:col-span-3"><ConsultationTrendChart dashboard={d} /></div>
                <div className="xl:col-span-2"><NewPatientsChart dashboard={d} /></div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <BreakdownBars
                  title="Patient conditions"
                  description={isDoctor ? "Latest condition of your patients" : "Latest condition of every patient"}
                  valueLabel="patients"
                  rows={conditionRows(d.currentConditions)}
                />
                <BreakdownBars
                  title="Visits by condition"
                  description="Condition recorded at each visit in this period"
                  valueLabel="visits"
                  rows={conditionRows(d.conditions)}
                />
                <BreakdownBars
                  title="Most prescribed generics"
                  description="Generics on the most prescriptions in this period"
                  valueLabel="prescriptions"
                  rows={d.topMedicines.map((m) => ({ key: m.name, label: m.name, title: m.name, value: m.count, detail: "" }))}
                />
              </div>

              {d.patientsPerDoctor && (
                <BreakdownBars
                  title="Patients per doctor"
                  description="Top doctors by active patients, with their consultations in this period"
                  valueLabel="patients"
                  rows={d.patientsPerDoctor.map((doc) => ({
                    key: doc.doctorId,
                    label: (
                      <span>
                        <span className="font-medium">{doc.name}</span>
                        {doc.specialization && <span className="text-muted-foreground"> · {doc.specialization}</span>}
                      </span>
                    ),
                    title: doc.name,
                    value: doc.patients,
                    detail: `${doc.consultations} visits`,
                  }))}
                />
              )}
            </>
          ) : (
            <div className="grid gap-4 xl:grid-cols-5">
              <Skeleton className="h-96 xl:col-span-3" />
              <Skeleton className="h-96 xl:col-span-2" />
            </div>
          )}
        </div>
      )}
    </>
  );
}
