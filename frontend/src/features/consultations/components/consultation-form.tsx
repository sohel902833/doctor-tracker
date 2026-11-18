"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Copy,
  FilePlus2,
  History,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConditionBadge } from "@/components/common/condition-badge";
import { NoAccess } from "@/components/feedback/states";
import { Field, TextAreaField, TextField } from "@/components/form/fields";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan, useSession } from "@/features/auth/session-provider";
import { doctorPatientsApi } from "@/features/doctor-patients/api";
import { PatientHistorySheet } from "@/features/patients/components/patient-history-sheet";
import { usePatient, usePatientLookup } from "@/features/patients/hooks";
import { ApiError } from "@/lib/api/client";
import { CONDITION_STYLES, CONDITIONS, GENDERS, MEAL_TIMINGS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import type { Consultation } from "@/lib/models";
import { cn } from "@/lib/utils";
import type { ConsultationInput } from "../api";
import { useCreateConsultation } from "../hooks";
import { fromConsultation, type PrescriptionData } from "../prescription";
import { MedicineRows, NEW_MEDICINE_ROW } from "./medicine-rows";
import { PrescriptionActions } from "./prescription-actions";
import { PrescriptionView } from "./prescription-view";

const count = (label: string) =>
  z.number({ error: `${label} must be a number` }).min(0, "Cannot be negative").max(10, "Max 10");

const schema = z.object({
  phone: z.string().trim().min(6, "Phone is required"),
  name: z.string().trim().min(1, "Name is required"),
  age: z.string().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 130), "Age is not valid"),
  gender: z.string(),
  condition: z.enum(CONDITIONS, { error: "Select the patient's condition" }),
  diagnosis: z.string(),
  notes: z.string(),
  medicines: z.array(
    z.object({
      medicineId: z.string(),
      name: z.string().trim().min(1, "Pick or type a medicine"),
      strength: z.string(),
      genericName: z.string(),
      dosageForm: z.string(),
      dose: z.string().trim().min(1, "Dose is required"),
      morning: count("Morning"),
      noon: count("Noon"),
      night: count("Night"),
      mealTiming: z.enum(MEAL_TIMINGS),
      durationDays: z.number({ error: "Days are required" }).int("Whole days").min(1, "At least 1 day").max(365, "Max 365"),
      instructions: z.string(),
    }),
  ),
  advice: z.array(z.string()),
  followUpDate: z.string(),
});
export type ConsultationFormValues = z.infer<typeof schema>;

const EMPTY: Partial<ConsultationFormValues> = {
  phone: "",
  name: "",
  age: "",
  gender: "",
  diagnosis: "",
  notes: "",
  medicines: [{ ...NEW_MEDICINE_ROW }],
  advice: [],
  followUpDate: "",
};

const ADVICE_SUGGESTIONS = [
  "Drink plenty of water",
  "Take adequate rest",
  "Reduce salt intake",
  "Walk 30 minutes daily",
  "Avoid oily and spicy food",
  "Return if symptoms get worse",
];

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

/** Backend error keys -> form field names. */
const toFormField = (key: string) =>
  key
    .replace(/^patient\./, "")
    .replace(/^patientId$/, "phone")
    .replace(/^medicines\.(\d+)\.schedule\.(\w+)$/, "medicines.$1.$2") as FieldPath<ConsultationFormValues>;

export function ConsultationForm() {
  const user = useSession();
  const canCreate = useCan("consultation.create");
  const searchParams = useSearchParams();
  const create = useCreateConsultation();

  const form = useForm<ConsultationFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [saved, setSaved] = useState<Consultation | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [customAdvice, setCustomAdvice] = useState("");
  const [repeating, setRepeating] = useState(false);

  // ---------- Patient: preselected (?patient=) or found by phone ----------

  // ?patient=<id> (from "Start consultation"): fill the phone, and the
  // phone lookup below takes it from there.
  const preselected = usePatient(searchParams.get("patient"));
  useEffect(() => {
    if (preselected.data?.phone) form.setValue("phone", preselected.data.phone);
  }, [preselected.data, form]);

  const phone = useWatch({ control: form.control, name: "phone" }) ?? "";
  const lookup = usePatientLookup(phone);
  const found = lookup.data?.patient ?? null;
  const relation = lookup.data?.relation ?? null;
  // Derived, not stored: whoever owns the typed phone is the patient.
  // No match means a new patient.
  const patientId = lookup.enabled ? (found?._id ?? null) : null;

  // Fill name/age/gender once per found patient (the doctor can still edit).
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!found || filledFor.current === found._id) return;
    filledFor.current = found._id;
    form.setValue("name", found.name, { shouldValidate: true });
    form.setValue("age", found.age != null ? String(found.age) : "");
    form.setValue("gender", found.gender ?? "");
  }, [found, form]);

  const lookupError = lookup.error instanceof ApiError ? lookup.error.fieldErrors.phone ?? lookup.error.message : null;
  const nextVisit = (relation?.visitCount ?? 0) + 1;

  // ---------- Unsaved changes guard ----------

  const isDirty = form.formState.isDirty;
  useEffect(() => {
    if (!isDirty || saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, saved]);

  // ---------- Live preview ----------

  const values = useWatch({ control: form.control });
  const currentHospital = user.hospitals?.find((h) => h.isCurrent)?.hospital?.name ?? null;

  const preview = useMemo<PrescriptionData>(
    () => ({
      prescriptionNo: null,
      visitNumber: patientId || values.name ? nextVisit : null,
      visitType: nextVisit === 1 ? "FIRST" : "FOLLOW_UP",
      date: new Date().toISOString(),
      doctor: {
        name: user.name,
        specialization: user.doctorProfile?.specialization ?? null,
        qualifications: user.doctorProfile?.qualifications ?? null,
        registrationNo: user.doctorProfile?.registrationNo ?? null,
        designation: user.doctorProfile?.designation ?? null,
        hospital: currentHospital,
      },
      patient: {
        name: values.name ?? "",
        age: values.age ? Number(values.age) : null,
        gender: values.gender || null,
        phone: values.phone || null,
      },
      condition: values.condition ?? null,
      diagnosis: values.diagnosis || null,
      notes: values.notes || null,
      medicines: (values.medicines ?? []).map((m) => ({
        name: m?.name ?? "",
        strength: m?.strength || null,
        genericName: m?.genericName || null,
        dosageForm: m?.dosageForm || null,
        dose: m?.dose ?? "",
        schedule: { morning: m?.morning || 0, noon: m?.noon || 0, night: m?.night || 0 },
        mealTiming: m?.mealTiming ?? "ANY",
        durationDays: Number.isFinite(m?.durationDays) ? (m?.durationDays as number) : null,
        instructions: m?.instructions || null,
      })),
      advice: (values.advice ?? []).filter(Boolean) as string[],
      followUpDate: values.followUpDate || null,
    }),
    [values, user, currentHospital, patientId, nextVisit],
  );

  const savedData = useMemo(() => (saved ? fromConsultation(saved) : null), [saved]);

  if (!canCreate || user.userType !== "DOCTOR") return <NoAccess />;

  // ---------- Actions ----------

  const repeatLast = async () => {
    if (!patientId) return;
    setRepeating(true);
    try {
      const last = (await doctorPatientsApi.consultations("me", patientId, { limit: 1 })).items[0];
      if (!last) return void toast.info("No previous prescription with this patient");
      form.setValue(
        "medicines",
        last.medicines.map((m) => ({
          medicineId: m.medicine ?? "",
          name: m.name,
          strength: m.strength ?? "",
          genericName: m.genericName ?? "",
          dosageForm: m.dosageForm ?? "",
          dose: m.dose,
          morning: m.schedule.morning,
          noon: m.schedule.noon,
          night: m.schedule.night,
          mealTiming: m.mealTiming,
          durationDays: m.durationDays,
          instructions: m.instructions ?? "",
        })),
        { shouldDirty: true },
      );
      form.setValue("advice", last.advice, { shouldDirty: true });
      toast.success(`Copied ${last.medicines.length} medicine(s) from ${last.prescriptionNo}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRepeating(false);
    }
  };

  const toggleAdvice = (item: string) => {
    const current = form.getValues("advice");
    form.setValue("advice", current.includes(item) ? current.filter((a) => a !== item) : [...current, item], { shouldDirty: true });
  };

  const addCustomAdvice = () => {
    const item = customAdvice.trim();
    if (!item) return;
    if (!form.getValues("advice").includes(item)) toggleAdvice(item);
    setCustomAdvice("");
  };

  const onSubmit = form.handleSubmit((v) => {
    const patientFields = {
      name: v.name,
      ...(v.age !== "" && { age: Number(v.age) }),
      gender: v.gender || null,
    };
    const input: ConsultationInput = {
      ...(patientId ? { patientId, patient: patientFields } : { patient: { ...patientFields, phone: v.phone } }),
      condition: v.condition,
      diagnosis: orNull(v.diagnosis),
      notes: orNull(v.notes),
      medicines: v.medicines.map((m) => ({
        ...(m.medicineId && { medicineId: m.medicineId }),
        name: m.name,
        strength: orNull(m.strength),
        genericName: orNull(m.genericName),
        dosageForm: orNull(m.dosageForm),
        dose: m.dose,
        schedule: { morning: m.morning, noon: m.noon, night: m.night },
        mealTiming: m.mealTiming,
        durationDays: m.durationDays,
        instructions: orNull(m.instructions),
      })),
      advice: v.advice,
      followUpDate: orNull(v.followUpDate),
    };

    create.mutate(input, {
      onSuccess: (consultation) => {
        setSaved(consultation);
        toast.success(`Saved ${consultation.prescriptionNo}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
          for (const [key, message] of Object.entries(error.fieldErrors)) {
            form.setError(toFormField(key), { type: "server", message });
          }
          toast.error("Please fix the highlighted fields");
        } else toast.error(error.message);
      },
    });
  });

  const startNew = () => {
    setSaved(null);
    filledFor.current = null;
    form.reset(EMPTY);
  };

  // ---------- Saved ----------

  if (saved && savedData) {
    return (
      <>
        <PageHeader title="Consultation saved" description={`${saved.patientSnapshot.name} · visit #${saved.visitNumber}`} />
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-primary" />
            <div>
              <p className="font-medium">Prescription {saved.prescriptionNo}</p>
              <p className="text-sm text-muted-foreground">Print it or download a PDF for the patient.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrescriptionActions data={savedData} />
            <Button variant="outline" asChild><Link href={`/consultations/${saved._id}`}>View</Link></Button>
            <Button onClick={startNew}><FilePlus2 /> New consultation</Button>
          </div>
        </div>
        <div className="mx-auto max-w-3xl">
          <PrescriptionView data={savedData} id="print-area" />
        </div>
      </>
    );
  }

  // ---------- Form ----------

  return (
    <>
      <PageHeader title="New consultation" description="Find or add the patient, then write the prescription." />

      <form onSubmit={onSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-6">
          {/* 1. Patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">1. Patient</CardTitle>
              <CardDescription>Enter the phone number: returning patients fill in automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message ?? lookupError ?? undefined} required>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" {...form.register("phone")} placeholder="01711-000000" className="pl-8" autoComplete="off" autoFocus />
                  {lookup.isFetching && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
              </Field>

              {lookup.enabled && lookup.isSuccess && (
                <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm", found ? "border-primary/30 bg-primary/5" : "bg-muted/40")}>
                  <div className="flex items-center gap-2">
                    {found ? <CheckCircle2 className="size-4 text-primary" /> : <UserPlus className="size-4 text-muted-foreground" />}
                    {found ? (
                      <span>
                        {relation?.visitCount ? `Returning patient · visit #${nextVisit} with you` : "Existing patient · first visit with you"}
                        {relation?.lastVisitAt && <span className="text-muted-foreground"> · last {formatDate(relation.lastVisitAt)}</span>}
                      </span>
                    ) : (
                      <span>New patient: they will be added to your list.</span>
                    )}
                    {relation?.lastCondition && <ConditionBadge condition={relation.lastCondition} />}
                  </div>
                  {found && (
                    <div className="flex gap-1">
                      {Boolean(relation?.visitCount) && (
                        <Button type="button" variant="ghost" size="sm" onClick={repeatLast} disabled={repeating}>
                          {repeating ? <Loader2 className="animate-spin" /> : <Copy />} Repeat last prescription
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
                        <History /> History
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
                <TextField form={form} name="name" label="Full name" required />
                <TextField form={form} name="age" label="Age" type="text" inputMode="numeric" />
                <Field label="Gender">
                  <Controller
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => <SelectItem key={g} value={g}>{humanize(g)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* 2. Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Condition" error={form.formState.errors.condition?.message} required>
                <Controller
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Condition">
                      {CONDITIONS.map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          role="radio"
                          aria-checked={field.value === condition}
                          onClick={() => field.onChange(condition)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                            field.value === condition ? CONDITION_STYLES[condition] : "hover:bg-muted",
                          )}
                        >
                          {humanize(condition)}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </Field>
              <TextField form={form} name="diagnosis" label="Diagnosis" placeholder="e.g. Hypertension" />
              <TextAreaField form={form} name="notes" label="Notes" rows={2} placeholder="BP, temperature, symptoms…" />
            </CardContent>
          </Card>

          {/* 3. Medicines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Medicines</CardTitle>
              <CardDescription>Search 21,000+ medicines by brand or generic, or type your own.</CardDescription>
            </CardHeader>
            <CardContent>
              <MedicineRows form={form} />
            </CardContent>
          </Card>

          {/* 4. Advice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Advice & follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ADVICE_SUGGESTIONS.map((item) => {
                  const selected = values.advice?.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAdvice(item)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {selected ? <X className="size-3" /> : <Sparkles className="size-3" />} {item}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customAdvice}
                  onChange={(e) => setCustomAdvice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAdvice(); } }}
                  placeholder="Add custom advice…"
                />
                <Button type="button" variant="outline" onClick={addCustomAdvice}><Plus /> Add</Button>
              </div>
              {values.advice?.some((a) => a && !ADVICE_SUGGESTIONS.includes(a)) && (
                <div className="flex flex-wrap gap-2">
                  {values.advice.filter((a): a is string => Boolean(a) && !ADVICE_SUGGESTIONS.includes(a as string)).map((item) => (
                    <Badge key={item} variant="secondary" className="gap-1">
                      {item}
                      <button type="button" aria-label={`Remove ${item}`} onClick={() => toggleAdvice(item)}><X className="size-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <TextField form={form} name="followUpDate" label="Follow-up date" type="date" className="max-w-xs" />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={startNew} disabled={create.isPending}>Clear</Button>
            <Button type="submit" size="lg" disabled={create.isPending || lookup.isFetching}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Save consultation
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <aside className="space-y-2 lg:sticky lg:top-20">
          <p className="text-sm font-medium text-muted-foreground">Prescription preview</p>
          <PrescriptionView data={preview} className="max-h-[calc(100svh-8rem)] overflow-y-auto" />
        </aside>
      </form>

      <PatientHistorySheet patientId={historyOpen ? patientId : null} onOpenChange={setHistoryOpen} />
    </>
  );
}
