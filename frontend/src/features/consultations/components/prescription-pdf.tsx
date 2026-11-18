import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { MEAL_TIMING_LABELS } from "@/lib/constants";
import { formatDate, formatSchedule, humanize } from "@/lib/format";
import type { PrescriptionData } from "../prescription";

// Loaded only when the user clicks "Download PDF" (see download-pdf.ts),
// so @react-pdf/renderer never ships in the main bundle.

const TEAL = "#0f766e";
const MUTED = "#525252";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#171717" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: TEAL, paddingBottom: 10 },
  doctorName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED },
  small: { fontSize: 8, color: "#737373" },
  right: { alignItems: "flex-end" },
  hospital: { color: TEAL, fontFamily: "Helvetica-Bold", fontSize: 11 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 8 },
  rx: { fontSize: 20, color: TEAL, fontFamily: "Times-Bold", marginBottom: 6, marginTop: 10 },
  med: { flexDirection: "row", marginBottom: 8 },
  medIndex: { width: 16, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingTop: 10 },
  signature: { width: 140, borderBottomWidth: 1, borderBottomColor: "#a3a3a3", height: 28, marginBottom: 3 },
});

export function PrescriptionPdf({ data }: { data: PrescriptionData }) {
  const { doctor, patient } = data;
  const patientLine = [patient.age != null && `${patient.age} yrs`, patient.gender && humanize(patient.gender), patient.phone]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={data.prescriptionNo ?? "Prescription"} author={doctor.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.doctorName}>{doctor.name}</Text>
            {doctor.qualifications && <Text style={s.muted}>{doctor.qualifications}</Text>}
            <Text style={s.muted}>{[doctor.designation, doctor.specialization].filter(Boolean).join(", ")}</Text>
            {doctor.registrationNo && <Text style={s.small}>Reg. no. {doctor.registrationNo}</Text>}
          </View>
          <View style={s.right}>
            <Text style={s.hospital}>{doctor.hospital ?? "Doctor Tracker"}</Text>
            <Text style={s.small}>{data.prescriptionNo ?? "Draft"}</Text>
            <Text style={s.small}>{formatDate(data.date)}</Text>
          </View>
        </View>

        <View style={s.row}>
          <Text>
            <Text style={s.bold}>{patient.name}</Text>
            {patientLine ? <Text style={s.muted}>{`  ·  ${patientLine}`}</Text> : null}
          </Text>
          <Text style={s.small}>
            {[
              data.visitNumber != null && `Visit #${data.visitNumber} (${data.visitType === "FIRST" ? "first" : "follow-up"})`,
              data.condition && humanize(data.condition),
            ].filter(Boolean).join("  ·  ")}
          </Text>
        </View>

        {(data.diagnosis || data.notes) && (
          <View style={s.section}>
            {data.diagnosis && <Text><Text style={s.bold}>Diagnosis: </Text>{data.diagnosis}</Text>}
            {data.notes && <Text style={s.muted}><Text style={s.bold}>Notes: </Text>{data.notes}</Text>}
          </View>
        )}

        <Text style={s.rx}>Rx</Text>
        {data.medicines.map((m, index) => (
          <View key={index} style={s.med} wrap={false}>
            <Text style={s.medIndex}>{index + 1}.</Text>
            <View>
              <Text style={s.bold}>
                {[m.name, m.strength].filter(Boolean).join(" ")}
                {m.dosageForm ? <Text style={s.muted}>{`  ·  ${m.dosageForm}`}</Text> : null}
              </Text>
              {m.genericName && <Text style={s.small}>{m.genericName}</Text>}
              <Text>
                {[m.dose, formatSchedule(m.schedule), MEAL_TIMING_LABELS[m.mealTiming], m.durationDays && `${m.durationDays} days`]
                  .filter(Boolean)
                  .join("   ·   ")}
              </Text>
              {m.instructions && <Text style={s.small}>{m.instructions}</Text>}
            </View>
          </View>
        ))}

        {data.advice.length > 0 && (
          <View style={{ ...s.section, borderTopWidth: 1, borderTopColor: "#e5e5e5", borderBottomWidth: 0 }}>
            <Text style={[s.bold, { marginBottom: 3 }]}>Advice</Text>
            {data.advice.map((item, index) => <Text key={index}>•  {item}</Text>)}
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.small}>
            {data.followUpDate ? `Follow-up: ${formatDate(data.followUpDate)}` : "No follow-up scheduled"}
          </Text>
          <View style={{ alignItems: "center" }}>
            <View style={s.signature} />
            <Text style={s.small}>Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
