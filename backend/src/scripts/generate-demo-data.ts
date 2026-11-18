/**
 * Generates the demo data the seed imports (when SEED_DEMO_DATA=true):
 *
 *   npm run demo:generate   ->   data/demo/{hospitals,doctors,patients,consultations}.json
 *
 * Deterministic (fixed random seed), so re-running gives the same files.
 * Dates are stored as "days ago" and turned into real dates at import,
 * so the dashboard always shows recent activity. All names are fictional.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../../data");
const OUT_DIR = path.join(DATA_DIR, "demo");

// ---------- Deterministic random ----------

let seed = 20_261_119;
const random = () => {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};
const int = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const chance = (p: number) => random() < p;
const weighted = <T>(entries: [T, number][]) => {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) {
    if ((roll -= weight) <= 0) return value;
  }
  return entries[entries.length - 1][0];
};

// ---------- Vocabulary ----------

const MALE = ["Rahim", "Karim", "Hasan", "Tanvir", "Arif", "Imran", "Sajid", "Fahim", "Rakib", "Nayeem", "Shakil", "Mahmud", "Ashraf", "Jamal", "Rafiq", "Habib", "Sohel", "Mizan", "Zahid", "Kamal", "Anis", "Faisal", "Masud", "Shafiq", "Rezaul"];
const FEMALE = ["Ayesha", "Fatima", "Nusrat", "Sadia", "Farhana", "Tahmina", "Rumana", "Shirin", "Nasrin", "Sharmin", "Jannat", "Lamia", "Mithila", "Tania", "Rehana", "Sabina", "Moushumi", "Afroza", "Nadia", "Sumaiya", "Rokeya", "Lubna", "Parvin", "Shahana", "Dilruba"];
const SURNAMES = ["Ahmed", "Hossain", "Rahman", "Islam", "Chowdhury", "Khan", "Akter", "Begum", "Sarker", "Talukder", "Mia", "Uddin", "Haque", "Karim", "Siddique", "Bhuiyan", "Mollah", "Sheikh", "Paul", "Das"];
const AREAS = ["Dhanmondi", "Gulshan", "Mirpur", "Uttara", "Mohammadpur", "Banani", "Motijheel", "Badda", "Bashundhara", "Shyamoli", "Rampura", "Malibagh"];

const HOSPITAL_NAMES = [
  "Green Valley General Hospital", "Riverside Medical College Hospital", "Sunrise Specialized Hospital",
  "Lakeview Heart Institute", "Crescent Children's Hospital", "Northgate Diagnostic & Hospital",
  "Harmony Women's Hospital", "Central City Medical Centre", "Bluebell Eye & ENT Hospital",
  "Silverline Orthopaedic Centre", "Meadowbrook Community Hospital", "Evergreen Neuro Centre",
];

type Diagnosis = { name: string; generics: string[]; advice: string[]; chronic?: boolean };

const SPECIALIZATIONS: { name: string; diagnoses: Diagnosis[] }[] = [
  {
    name: "Cardiology",
    diagnoses: [
      { name: "Hypertension", generics: ["Amlodipine", "Losartan", "Bisoprolol"], advice: ["Reduce salt intake", "Walk 30 minutes daily", "Check blood pressure weekly"], chronic: true },
      { name: "Dyslipidemia", generics: ["Atorvastatin"], advice: ["Avoid oily and spicy food", "Walk 30 minutes daily"], chronic: true },
    ],
  },
  {
    name: "Endocrinology",
    diagnoses: [
      { name: "Type 2 diabetes", generics: ["Metformin", "Gliclazide"], advice: ["Avoid sugary food and drinks", "Walk 30 minutes daily", "Check blood sugar regularly"], chronic: true },
      { name: "Vitamin D deficiency", generics: ["Calcium"], advice: ["Get morning sunlight"] },
    ],
  },
  {
    name: "Gastroenterology",
    diagnoses: [
      { name: "Gastritis", generics: ["Omeprazole", "Esomeprazole", "Domperidone"], advice: ["Avoid oily and spicy food", "Eat small, regular meals"] },
      { name: "GERD", generics: ["Pantoprazole", "Rabeprazole", "Domperidone"], advice: ["Don't lie down right after meals", "Avoid oily and spicy food"], chronic: true },
      { name: "Amoebic dysentery", generics: ["Metronidazole"], advice: ["Drink plenty of water", "Drink only boiled water"] },
    ],
  },
  {
    name: "Pulmonology",
    diagnoses: [
      { name: "Bronchial asthma", generics: ["Montelukast", "Salbutamol"], advice: ["Avoid dust and smoke", "Keep your inhaler with you"], chronic: true },
      { name: "Lower respiratory tract infection", generics: ["Azithromycin", "Paracetamol"], advice: ["Take adequate rest", "Drink plenty of water"] },
    ],
  },
  {
    name: "Medicine",
    diagnoses: [
      { name: "Viral fever", generics: ["Paracetamol"], advice: ["Take adequate rest", "Drink plenty of water", "Return if fever lasts over 3 days"] },
      { name: "Upper respiratory tract infection", generics: ["Cetirizine", "Paracetamol", "Amoxicillin"], advice: ["Take adequate rest", "Drink plenty of water"] },
      { name: "Urinary tract infection", generics: ["Ciprofloxacin", "Cefixime"], advice: ["Drink plenty of water", "Complete the full antibiotic course"] },
    ],
  },
  {
    name: "Orthopaedics",
    diagnoses: [
      { name: "Low back pain", generics: ["Naproxen", "Diclofenac", "Omeprazole"], advice: ["Avoid lifting heavy objects", "Apply a warm compress"] },
      { name: "Osteoarthritis", generics: ["Naproxen", "Calcium"], advice: ["Do light daily exercise", "Keep a healthy weight"], chronic: true },
    ],
  },
  {
    name: "Dermatology",
    diagnoses: [
      { name: "Allergic dermatitis", generics: ["Fexofenadine", "Levocetirizine"], advice: ["Avoid known allergens", "Use a mild soap"] },
    ],
  },
  {
    name: "Psychiatry",
    diagnoses: [
      { name: "Generalized anxiety disorder", generics: ["Sertraline", "Clonazepam"], advice: ["Sleep 7–8 hours", "Practise breathing exercises"], chronic: true },
    ],
  },
  {
    name: "Paediatrics",
    diagnoses: [
      { name: "Acute gastroenteritis", generics: ["Paracetamol", "Domperidone"], advice: ["Give oral rehydration salts", "Continue breastfeeding or normal diet"] },
      { name: "Common cold", generics: ["Cetirizine", "Paracetamol"], advice: ["Take adequate rest", "Drink plenty of water"] },
    ],
  },
];

const QUALIFICATIONS = ["MBBS, FCPS", "MBBS, MD", "MBBS, MRCP (UK)", "MBBS, FCPS, MD", "MBBS, MS", "MBBS, DDV", "MBBS, DCH, FCPS"];
const DESIGNATIONS = ["Consultant", "Senior Consultant", "Associate Professor", "Professor", "Assistant Professor"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["MALE", "FEMALE"] as const;

// ---------- Catalog: real brands per generic ----------

type CatalogMedicine = {
  brandId: number;
  name: string;
  genericName: string | null;
  dosageForm: string;
  strength: string | null;
  type: string;
};

const pickBrandsByGeneric = (catalog: CatalogMedicine[], generics: string[]) =>
  new Map(
    generics.map((generic) => {
      const brands = catalog.filter(
        (m) =>
          m.type === "allopathic" &&
          m.genericName?.toLowerCase().startsWith(generic.toLowerCase()) &&
          !m.genericName.includes("+") &&
          /^(tablet|capsule|syrup|inhaler)/i.test(m.dosageForm),
      );
      return [generic, brands.slice(0, 40)];
    }),
  );

// ---------- Builders ----------

const personName = (gender: "MALE" | "FEMALE") =>
  `${pick(gender === "MALE" ? MALE : FEMALE)} ${pick(SURNAMES)}`;

let phoneCounter = 0;
/** 0199-prefixed, unique and clearly demo numbers. */
const nextPhone = () => `0199${String(1_000_000 + phoneCounter++).slice(1)}`;

const dateOfBirth = (minAge: number, maxAge: number) => {
  const year = 2026 - int(minAge, maxAge);
  return `${year}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;
};

const buildHospitals = () =>
  HOSPITAL_NAMES.map((name, i) => ({
    name,
    address: `House ${int(1, 120)}, Road ${int(1, 40)}, ${AREAS[i % AREAS.length]}, Dhaka`,
    phone: `0255${String(100_000 + i * 731).slice(0, 6)}`,
    email: `info@${name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 18)}.demo`,
  }));

const buildDoctors = () => {
  const doctors = [];
  for (let i = 0; i < 25; i++) {
    const gender = pick(GENDERS);
    const name = personName(gender);
    const specialization = SPECIALIZATIONS[i % SPECIALIZATIONS.length].name;
    const current = pick(HOSPITAL_NAMES);
    const past = pick(HOSPITAL_NAMES.filter((h) => h !== current));
    const joinedYear = int(2015, 2022);

    doctors.push({
      name: `Dr. ${name}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}.${i + 1}@demo.doctortracker.dev`,
      phone: nextPhone(),
      gender,
      dateOfBirth: dateOfBirth(32, 64),
      bloodGroup: pick(BLOOD_GROUPS),
      doctorProfile: {
        specialization,
        qualifications: pick(QUALIFICATIONS),
        designation: pick(DESIGNATIONS),
        registrationNo: `A-${int(10_000, 99_999)}`,
      },
      hospitals: [
        { hospital: past, startDate: `${joinedYear}-01-01`, endDate: `${joinedYear + int(1, 3)}-06-30`, isCurrent: false, summary: "Medical officer" },
        { hospital: current, startDate: `${joinedYear + 4}-01-01`, endDate: null, isCurrent: true, summary: `${specialization} consultant` },
      ],
    });
  }
  return doctors;
};

const buildPatients = (count: number) =>
  Array.from({ length: count }, () => {
    const gender = pick(GENDERS);
    return {
      name: personName(gender),
      phone: nextPhone(),
      gender,
      dateOfBirth: dateOfBirth(2, 85),
      bloodGroup: chance(0.85) ? pick(BLOOD_GROUPS) : null,
    };
  });

/** More recent days are busier (clinic growth), weekends quieter. */
const pickDaysAgo = () => {
  for (;;) {
    const daysAgo = Math.floor(Math.pow(random(), 1.25) * 365);
    const weekday = new Date(Date.now() - daysAgo * 86_400_000).getUTCDay();
    if (weekday === 5 && chance(0.6)) continue; // Friday: weekend in Bangladesh
    return daysAgo;
  }
};

const conditionFor = (visitIndex: number, totalVisits: number, chronic: boolean) => {
  if (visitIndex === 0) return weighted([["UNDER_TREATMENT", 55], ["CRITICAL", 20], ["STABLE", 25]]);
  if (visitIndex === totalVisits - 1 && !chronic) return weighted([["RECOVERED", 70], ["STABLE", 30]]);
  return weighted([["STABLE", 55], ["UNDER_TREATMENT", 35], ["RECOVERED", chronic ? 0 : 10]]);
};

const buildConsultations = (
  doctors: ReturnType<typeof buildDoctors>,
  patients: ReturnType<typeof buildPatients>,
  brands: Map<string, CatalogMedicine[]>,
) => {
  const consultations = [];
  const assignments: { doctorEmail: string; patientPhone: string }[] = [];
  let key = 0;

  for (const patient of patients) {
    // Most patients see one doctor; some see two.
    const doctorCount = chance(0.18) ? 2 : 1;
    const seenDoctors = new Set<string>();

    for (let d = 0; d < doctorCount; d++) {
      const doctor = pick(doctors.filter((doc) => !seenDoctors.has(doc.email)));
      seenDoctors.add(doctor.email);

      // ~4% are on the doctor's list without a visit yet (admin-added).
      if (chance(0.04)) {
        assignments.push({ doctorEmail: doctor.email, patientPhone: patient.phone });
        continue;
      }

      const specialty = SPECIALIZATIONS.find((s) => s.name === doctor.doctorProfile.specialization)!;
      const diagnosis = pick(specialty.diagnoses);
      const visits = weighted<number>([[1, 30], [2, 28], [3, 20], [4, 12], [5, 6], [6, 4]]);
      const firstDaysAgo = Math.max(pickDaysAgo(), (visits - 1) * 14);

      for (let v = 0; v < visits; v++) {
        const daysAgo = Math.max(0, Math.round(firstDaysAgo - (firstDaysAgo / visits) * v - int(0, 6)));
        const condition = conditionFor(v, visits, Boolean(diagnosis.chronic));
        const medicineCount = condition === "RECOVERED" ? int(0, 1) : int(1, Math.min(3, diagnosis.generics.length));
        const generics = [...diagnosis.generics].sort(() => random() - 0.5).slice(0, medicineCount);

        consultations.push({
          sourceKey: `DEMO-${String(++key).padStart(5, "0")}`,
          doctorEmail: doctor.email,
          patientPhone: patient.phone,
          daysAgo,
          minuteOfDay: int(9 * 60, 20 * 60), // 09:00–20:00
          condition,
          diagnosis: diagnosis.name,
          notes: chance(0.5) ? `BP ${int(100, 160)}/${int(65, 100)}, pulse ${int(62, 104)}/min` : null,
          medicines: generics.flatMap((generic) => {
            const options = brands.get(generic) ?? [];
            if (!options.length) return [];
            const brand = pick(options);
            const isSyrup = /syrup/i.test(brand.dosageForm);
            return [{
              medicineSourceId: brand.brandId,
              dose: isSyrup ? "1 tsp" : /inhaler/i.test(brand.dosageForm) ? "2 puffs" : "1 tab",
              schedule: weighted([[{ morning: 1, noon: 0, night: 1 }, 45], [{ morning: 1, noon: 0, night: 0 }, 25], [{ morning: 1, noon: 1, night: 1 }, 20], [{ morning: 0, noon: 0, night: 1 }, 10]]),
              mealTiming: weighted([["AFTER_MEAL", 60], ["BEFORE_MEAL", 25], ["ANY", 15]]),
              durationDays: diagnosis.chronic ? pick([30, 30, 60, 90]) : pick([3, 5, 7, 10, 14]),
              instructions: chance(0.15) ? "Take with a full glass of water" : null,
            }];
          }),
          advice: [...diagnosis.advice].sort(() => random() - 0.5).slice(0, int(1, diagnosis.advice.length)),
          followUpInDays: v < visits - 1 || diagnosis.chronic ? pick([7, 14, 30]) : null,
        });
      }
    }
  }
  return { consultations, assignments };
};

// ---------- Run ----------

const main = async () => {
  const catalog = JSON.parse(
    await readFile(path.join(DATA_DIR, "medicines/medicines.json"), "utf8"),
  ) as CatalogMedicine[];
  const brands = pickBrandsByGeneric(
    catalog,
    [...new Set(SPECIALIZATIONS.flatMap((s) => s.diagnoses.flatMap((d) => d.generics)))],
  );

  const hospitals = buildHospitals();
  const doctors = buildDoctors();
  const patients = buildPatients(900);
  const { consultations, assignments } = buildConsultations(doctors, patients, brands);

  await mkdir(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown) =>
    writeFile(path.join(OUT_DIR, `${name}.json`), `${JSON.stringify(data, null, 1)}\n`);

  await Promise.all([
    write("hospitals", hospitals),
    write("doctors", doctors),
    write("patients", patients),
    write("consultations", consultations),
    write("assignments", assignments),
  ]);

  console.log(
    `Demo data: ${hospitals.length} hospitals, ${doctors.length} doctors, ${patients.length} patients, ` +
      `${consultations.length} consultations, ${assignments.length} list-only assignments -> ${OUT_DIR}`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
