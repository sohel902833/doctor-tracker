import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Model } from "mongoose";
import { GenericModel } from "./generic.model";
import { MedicineModel } from "./medicine.model";
import { normalizeSearchText, toFormGroup } from "./medicine.utils";

/**
 * Imports the medicine catalog from backend/data/medicines/*.json:
 *   1. load the ids already in the database (one query)
 *   2. find the missing records in memory
 *   3. bulk-insert only those
 * Safe to re-run, and it never touches records already in the database.
 */

// Same relative path from src/ (tsx) and dist/ (node).
const DATA_DIR = path.resolve(__dirname, "../../../data/medicines");
const BATCH_SIZE = 1000;

type RawGeneric = {
  genericId: number;
  name: string;
  drugClass: string | null;
  indication: string | null;
};

type RawMedicine = {
  brandId: number;
  name: string;
  genericName: string | null;
  dosageForm: string;
  strength: string | null;
  manufacturer: string;
  type: "allopathic" | "herbal";
  package: string | null;
  priceBdt: number | null;
  packageSize: string | null;
};

export type ImportResult = { total: number; added: number };

const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8")) as T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insertInBatches = async (model: Model<any>, docs: unknown[]) => {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await model.insertMany(docs.slice(i, i + BATCH_SIZE), { ordered: false });
  }
  return docs.length;
};

/** "Unit Price: ৳ 35.00,(12's pack: ৳ 420.01)," -> trailing commas removed. */
const cleanPackageInfo = (value: string | null) =>
  value?.replace(/[,\s]+$/, "").trim() || null;

export const importGenerics = async (): Promise<ImportResult> => {
  const raw = await readJson<RawGeneric[]>("generics.json");

  const existing = await GenericModel.find()
    .select("sourceId normalizedName")
    .lean();
  const existingIds = new Set(existing.map((g) => g.sourceId));
  // An admin may already have added a generic with the same name.
  const existingNames = new Set(existing.map((g) => g.normalizedName));

  const missing = raw
    .filter(
      (g) =>
        !existingIds.has(g.genericId) &&
        !existingNames.has(normalizeSearchText(g.name)),
    )
    .map((g) => ({
      sourceId: g.genericId,
      name: g.name.trim(),
      normalizedName: normalizeSearchText(g.name),
      drugClass: g.drugClass,
      indication: g.indication,
    }));

  return {
    total: raw.length,
    added: await insertInBatches(GenericModel, missing),
  };
};

export const importMedicines = async (): Promise<ImportResult> => {
  const raw = await readJson<RawMedicine[]>("medicines.json");

  const existingIds = new Set(
    (
      await MedicineModel.find({ sourceId: { $ne: null } })
        .select("sourceId")
        .lean()
    ).map((m) => m.sourceId),
  );

  // Link each brand to its generic by name.
  const generics = await GenericModel.find()
    .select("name normalizedName")
    .lean();
  const genericsByName = new Map(generics.map((g) => [g.normalizedName, g]));

  const missing = raw
    .filter((m) => !existingIds.has(m.brandId))
    .map((m) => {
      const generic = m.genericName
        ? genericsByName.get(normalizeSearchText(m.genericName))
        : undefined;

      return {
        sourceId: m.brandId,
        name: m.name.trim(),
        normalizedName: normalizeSearchText(m.name),
        generic: generic?._id ?? null,
        genericName: generic?.name ?? m.genericName,
        normalizedGenericName: m.genericName
          ? normalizeSearchText(m.genericName)
          : null,
        dosageForm: m.dosageForm.trim(),
        formGroup: toFormGroup(m.dosageForm),
        strength: m.strength,
        manufacturer: m.manufacturer,
        type: m.type.toUpperCase(),
        priceBdt: m.priceBdt,
        packageInfo: cleanPackageInfo(m.package) ?? m.packageSize,
        isActive: true,
      };
    });

  return {
    total: raw.length,
    added: await insertInBatches(MedicineModel, missing),
  };
};
