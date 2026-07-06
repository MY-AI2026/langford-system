/**
 * System-wide, admin-tunable settings for the main Langford app.
 *
 * Single document `systemSettings/general` holding institute info plus the
 * editable lead-source and level lists. Consumers (student form, evaluation
 * form, reports) read these with a fallback to the hard-coded defaults in
 * `constants.ts`, so a missing/partial doc never breaks the UI.
 */

import { fetchDoc, restSet } from "@/lib/firebase/rest-helpers";
import { DEFAULT_LEAD_SOURCES, DEFAULT_LEVELS } from "@/lib/utils/constants";

const SETTINGS_PATH = "systemSettings/general";

export interface SystemSettings {
  instituteName: string;
  instituteNameAr: string;
  phone: string;
  address: string;
  leadSources: string[];
  levels: string[];
  updatedBy?: string;
  updatedAt?: unknown;
}

export const SYSTEM_SETTINGS_DEFAULTS: SystemSettings = {
  instituteName: "Langford International Institute",
  instituteNameAr: "معهد لانجفورد الدولي",
  phone: "",
  address: "Kuwait",
  leadSources: DEFAULT_LEAD_SOURCES,
  levels: DEFAULT_LEVELS,
};

function cleanList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return cleaned.length > 0 ? cleaned : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const doc = await fetchDoc(SETTINGS_PATH);
  if (!doc) return SYSTEM_SETTINGS_DEFAULTS;
  return {
    instituteName: str(doc.instituteName, SYSTEM_SETTINGS_DEFAULTS.instituteName),
    instituteNameAr: str(doc.instituteNameAr, SYSTEM_SETTINGS_DEFAULTS.instituteNameAr),
    phone: typeof doc.phone === "string" ? doc.phone : SYSTEM_SETTINGS_DEFAULTS.phone,
    address: typeof doc.address === "string" ? doc.address : SYSTEM_SETTINGS_DEFAULTS.address,
    leadSources: cleanList(doc.leadSources, SYSTEM_SETTINGS_DEFAULTS.leadSources),
    levels: cleanList(doc.levels, SYSTEM_SETTINGS_DEFAULTS.levels),
  };
}

export async function saveSystemSettings(
  settings: SystemSettings,
  actorUid: string
): Promise<void> {
  await restSet(SETTINGS_PATH, {
    instituteName: settings.instituteName.trim(),
    instituteNameAr: settings.instituteNameAr.trim(),
    phone: settings.phone.trim(),
    address: settings.address.trim(),
    leadSources: cleanList(settings.leadSources, DEFAULT_LEAD_SOURCES),
    levels: cleanList(settings.levels, DEFAULT_LEVELS),
    updatedBy: actorUid,
    updatedAt: new Date(),
  });
}
