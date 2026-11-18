import { HeartPulse } from "lucide-react";
import { memo } from "react";
import { ConditionBadge } from "@/components/common/condition-badge";
import { MEAL_TIMING_LABELS } from "@/lib/constants";
import { formatDate, formatSchedule, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PrescriptionData } from "../prescription";

/**
 * The prescription as printed. Memoized: the live preview re-renders only
 * when the prescription data actually changes, not on every keystroke
 * elsewhere in the form.
 */
export const PrescriptionView = memo(function PrescriptionView({
  data,
  id,
  className,
}: {
  data: PrescriptionData;
  id?: string;
  className?: string;
}) {
  const { doctor, patient } = data;
  const patientLine = [
    patient.age != null && `${patient.age} yrs`,
    patient.gender && humanize(patient.gender),
    patient.phone,
  ].filter(Boolean);

  return (
    <article id={id} className={cn("rounded-xl border bg-white p-6 text-[13px] text-neutral-900 shadow-sm", className)}>
      <header className="flex items-start justify-between gap-4 border-b-2 border-teal-700 pb-4">
        <div>
          <p className="text-lg font-semibold">{doctor.name || "Doctor"}</p>
          {doctor.qualifications && <p className="text-neutral-600">{doctor.qualifications}</p>}
          <p className="text-neutral-600">
            {[doctor.designation, doctor.specialization].filter(Boolean).join(", ")}
          </p>
          {doctor.registrationNo && <p className="text-xs text-neutral-500">Reg. no. {doctor.registrationNo}</p>}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 font-semibold text-teal-700">
            <HeartPulse className="size-4" /> {doctor.hospital ?? "Doctor Tracker"}
          </div>
          <p className="mt-1 text-xs text-neutral-500">{data.prescriptionNo ?? "Draft"}</p>
          <p className="text-xs text-neutral-500">{formatDate(data.date)}</p>
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-2 border-b py-3">
        <div>
          <span className="font-semibold">{patient.name || "Patient name"}</span>
          {patientLine.length > 0 && <span className="text-neutral-600"> · {patientLine.join(" · ")}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          {data.visitNumber != null && (
            <span>Visit #{data.visitNumber} ({data.visitType === "FIRST" ? "first" : "follow-up"})</span>
          )}
          {data.condition && <ConditionBadge condition={data.condition} />}
        </div>
      </section>

      {(data.diagnosis || data.notes) && (
        <section className="space-y-1 border-b py-3">
          {data.diagnosis && <p><span className="font-semibold">Diagnosis: </span>{data.diagnosis}</p>}
          {data.notes && <p className="text-neutral-600"><span className="font-semibold text-neutral-900">Notes: </span>{data.notes}</p>}
        </section>
      )}

      <section className="py-4">
        <p className="mb-2 font-serif text-2xl font-semibold text-teal-700">℞</p>
        {data.medicines.length === 0 ? (
          <p className="text-neutral-400">No medicines added.</p>
        ) : (
          <ol className="space-y-2.5">
            {data.medicines.map((m, index) => (
              <li key={index} className="grid grid-cols-[1.5rem_1fr] gap-1">
                <span className="font-semibold">{index + 1}.</span>
                <div>
                  <p className="font-semibold">
                    {m.name || "Medicine"} {m.strength && <span className="font-normal">{m.strength}</span>}
                    {m.dosageForm && <span className="font-normal text-neutral-600"> · {m.dosageForm}</span>}
                  </p>
                  {m.genericName && <p className="text-xs text-neutral-500">{m.genericName}</p>}
                  <p className="text-neutral-700">
                    {[m.dose, formatSchedule(m.schedule), MEAL_TIMING_LABELS[m.mealTiming], m.durationDays && `${m.durationDays} days`]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                  {m.instructions && <p className="text-xs text-neutral-500 italic">{m.instructions}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {data.advice.length > 0 && (
        <section className="border-t py-3">
          <p className="mb-1 font-semibold">Advice</p>
          <ul className="list-disc space-y-0.5 pl-5 text-neutral-700">
            {data.advice.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </section>
      )}

      <footer className="mt-6 flex items-end justify-between border-t pt-4 text-xs text-neutral-500">
        <p>{data.followUpDate ? <>Follow-up: <span className="font-semibold text-neutral-800">{formatDate(data.followUpDate)}</span></> : "No follow-up scheduled"}</p>
        <div className="text-center">
          <div className="mb-1 h-8 w-40 border-b border-neutral-400" />
          Signature
        </div>
      </footer>
    </article>
  );
});
