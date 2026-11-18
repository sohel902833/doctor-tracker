"use client";

import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { ConditionBadge } from "@/components/common/condition-badge";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { Consultation } from "@/lib/models";

/** Vertical timeline of a patient's consultations (newest first). */
export function ConsultationHistory({
  consultations,
  isLoading,
  error,
  showDoctor,
}: {
  consultations?: Consultation[];
  isLoading?: boolean;
  error?: Error | null;
  showDoctor?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} />;
  if (!consultations?.length) return <EmptyState title="No consultations yet" description="Visits will appear here." />;

  return (
    <ol className="relative space-y-3 border-l pl-5">
      {consultations.map((c) => (
        <li key={c._id} className="relative">
          <span className="absolute top-4 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary" />
          <Link
            href={`/consultations/${c._id}`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Visit #{c.visitNumber}</span>
                <Badge variant="secondary">{c.visitType === "FIRST" ? "First visit" : "Follow-up"}</Badge>
                <ConditionBadge condition={c.condition} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatDateTime(c.visitedAt)} · {c.prescriptionNo}
                {showDoctor && ` · ${c.doctorSnapshot.name}`}
                {c.diagnosis && ` · ${c.diagnosis}`}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
