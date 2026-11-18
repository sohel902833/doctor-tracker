import { ConditionBadge } from "@/components/common/condition-badge";
import { formatDate, humanize } from "@/lib/format";
import type { Patient } from "@/lib/models";

/** Key facts about a patient, shown at the top of history sheets. */
export function PatientSummary({ patient }: { patient: Patient }) {
  const facts = [
    { label: "Phone", value: patient.phone ?? "—" },
    { label: "Age", value: patient.age != null ? `${patient.age} years` : "—" },
    { label: "Gender", value: humanize(patient.gender) },
    { label: "Blood group", value: patient.bloodGroup ?? "—" },
    { label: "Registered", value: formatDate(patient.createdAt) },
  ];

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Current condition</span>
        <ConditionBadge condition={patient.patientProfile?.currentCondition} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {patient.doctors && patient.doctors.length > 0 && (
        <div className="text-sm">
          <span className="text-xs text-muted-foreground">Doctors: </span>
          {patient.doctors.map((d) => d.name).join(", ")}
        </div>
      )}
    </div>
  );
}
