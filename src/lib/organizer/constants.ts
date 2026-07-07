import { DayOfWeek, DayPattern } from "@/lib/types";

/**
 * Academic Organizer portal — routing + display helpers.
 *
 * The organizer is a standalone, separate-login surface (its own role
 * `academic_organizer`) that gathers PAID students, groups them by their
 * placement-test level, builds instructor schedules from those cohorts, and
 * shares each student's schedule as an image over WhatsApp.
 */

// ─── Routes — single source of truth for navigation ──────────────────────────
export const ORG_ROUTES = {
  home: "/organizer",
  students: "/organizer/students",
  classes: "/organizer/classes",
} as const;

// ─── Day labels (Arabic) keyed by DayOfWeek (0=Sun … 6=Sat) ──────────────────
export const DAY_LABELS_AR: Record<DayOfWeek, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

/** Kuwait work-week order used across the organizer (Sat → Thu, no Friday). */
export const ORG_WEEK_DAYS: DayOfWeek[] = [6, 0, 1, 2, 3, 4];

// ─── Day patterns offered by the schedule builder ────────────────────────────
export const PATTERN_DAY_MAP: Record<Exclude<DayPattern, "custom">, DayOfWeek[]> = {
  sat_mon_wed: [6, 1, 3],
  sun_tue_thu: [0, 2, 4],
};

export const PATTERN_OPTIONS: { value: DayPattern; label: string }[] = [
  { value: "sat_mon_wed", label: "السبت / الإثنين / الأربعاء" },
  { value: "sun_tue_thu", label: "الأحد / الثلاثاء / الخميس" },
  { value: "custom", label: "أيام مخصّصة" },
];

/** Time slots (24h "HH:mm") offered in the builder — 10:00 → 22:00. */
export const TIME_SLOTS: string[] = Array.from({ length: 13 }, (_, i) => {
  const hour = 10 + i;
  return `${String(hour).padStart(2, "0")}:00`;
});

/** Format a 24h "HH:mm" string as a friendly Arabic 12-hour label. */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "م" : "ص";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
}

/** Render a set of day numbers as an Arabic comma-joined label. */
export function formatDays(days: DayOfWeek[]): string {
  return [...days]
    .sort((a, b) => ORG_WEEK_DAYS.indexOf(a) - ORG_WEEK_DAYS.indexOf(b))
    .map((d) => DAY_LABELS_AR[d])
    .join("، ");
}

/**
 * Order-index a level string against the configured levels list so cohort
 * groups sort Starter → Advanced. Unknown / null levels sink to the bottom.
 */
export function levelOrderIndex(level: string | null, levels: string[]): number {
  if (!level) return Number.MAX_SAFE_INTEGER;
  const i = levels.indexOf(level);
  return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
}
