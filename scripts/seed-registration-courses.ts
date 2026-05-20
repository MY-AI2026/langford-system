/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
/**
 * Seed the regCourses collection with the initial Langford × Acceptix
 * catalogue. Idempotent — if a course with the same name already exists, it
 * is skipped.
 *
 * Usage:
 *
 *   1. Sign in to the app as an admin in your browser.
 *   2. Open DevTools → Application → IndexedDB → firebaseLocalStorageDb,
 *      find your stsTokenManager, copy the `accessToken` field.
 *   3. Export the env vars and run the script:
 *
 *      export NEXT_PUBLIC_FIREBASE_PROJECT_ID=langford-system
 *      export FIREBASE_ID_TOKEN="paste-token-here"
 *      npx tsx scripts/seed-registration-courses.ts
 *
 * The script writes via Firestore REST so it inherits all the security rules
 * (only admins succeed) and works without Firebase Admin SDK.
 */

import { SEED_COURSES, SEED_CURRENCY } from "../src/lib/registration/seed-courses";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const TOKEN = process.env.FIREBASE_ID_TOKEN;

if (!PROJECT_ID) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID env var.");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Missing FIREBASE_ID_TOKEN env var (admin user's ID token).");
  process.exit(1);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function listExistingCourses(): Promise<Set<string>> {
  const url = `${BASE}:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "regCourses" }] },
    }),
  });
  if (!res.ok) {
    console.error(`Failed to list existing courses: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const json = (await res.json()) as any[];
  const names = new Set<string>();
  for (const r of json) {
    const name = r?.document?.fields?.name?.stringValue;
    if (typeof name === "string") names.add(name);
  }
  return names;
}

async function createCourse(course: typeof SEED_COURSES[number]): Promise<void> {
  const now = new Date();
  const fields = toFirestoreFields({
    name: course.name,
    category: course.category,
    description: course.description,
    fee: course.fee ?? 0,
    currency: SEED_CURRENCY,
    durationHours: course.durationHours,
    durationLabel: course.durationLabel,
    isExclusiveAcceptix: course.isExclusiveAcceptix,
    isActive: true,
    createdBy: "seed-script",
    createdByName: "Seed Script",
    createdAt: now,
    updatedAt: now,
  });

  const url = `${BASE}/regCourses`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    console.error(`Failed to create "${course.name}": ${res.status} ${await res.text()}`);
    return;
  }
  console.log(`  ✓ Created: ${course.name}`);
}

async function main() {
  console.log("Seeding regCourses…\n");

  const existing = await listExistingCourses();
  console.log(`Found ${existing.size} existing course(s) — duplicates will be skipped.\n`);

  let created = 0;
  let skipped = 0;
  for (const course of SEED_COURSES) {
    if (existing.has(course.name)) {
      console.log(`  – Skipped (already exists): ${course.name}`);
      skipped++;
      continue;
    }
    await createCourse(course);
    created++;
  }

  console.log(`\nDone — created ${created}, skipped ${skipped}, total ${SEED_COURSES.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
