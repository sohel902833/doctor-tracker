import type { FormGroup } from "../../shared/constants/medical";

/** Lowercased copy used for index-friendly "starts with" search. */
export const normalizeSearchText = (value: string) => value.trim().toLowerCase();

// Checked in order: the first match wins, so e.g. "Inhalation Capsule" is
// INHALATION and "Ophthalmic Ointment" is TOPICAL, not DROPS.
const FORM_GROUP_RULES: [FormGroup, RegExp][] = [
  ["INHALATION", /inhal|nebuli|respirator/],
  ["INJECTION", /inject|infusion/],
  ["DROPS", /drop|^ophthalmic (solution|suspension|emulsion)/],
  ["CAPSULE", /capsule/],
  ["TABLET", /tablet/],
  ["TOPICAL", /cream|ointment|gel|lotion|topical|shampoo|patch|rub|scrub|soap|lacquer|bar|paste/],
  ["LIQUID", /syrup|suspension|solution|liquid|emulsion|mouthwash|powder|granule|saline/],
];

/** "Tablet (Extended Release)" -> "TABLET", "IM/IV Injection" -> "INJECTION". */
export const toFormGroup = (dosageForm: string): FormGroup => {
  const form = dosageForm.toLowerCase();
  return FORM_GROUP_RULES.find(([, pattern]) => pattern.test(form))?.[0] ?? "OTHER";
};
