import { RegCourseCategory, RegStudentStatus } from "@/lib/types";

/**
 * Commission rate paid to Acceptix per registered student (per the
 * Langford × Acceptix agreement). Snapshotted onto every regStudent at
 * registration time so historical reports stay immutable even if this
 * rate changes later.
 */
export const ACCEPTIX_COMMISSION_RATE = 0.1;

/** Default currency used across the registration module (Kuwaiti Dinar). */
export const REG_DEFAULT_CURRENCY = "KWD";

/** Default source string stamped on every Acceptix-registered student. */
export const REG_DEFAULT_SOURCE = "Acceptix";

// ─── Display labels (UI consumes these via the lookups below) ────────────────

export const REG_CATEGORY_LABELS: Record<RegCourseCategory, { en: string; ar: string }> = {
  esp: {
    en: "ESP — English for Specific Purposes",
    ar: "اللغة الإنجليزية لأغراض محددة (ESP)",
  },
  exam_prep: {
    en: "Exam Preparation",
    ar: "التحضير لاختبارات اللغة",
  },
  professional: {
    en: "Professional Courses",
    ar: "الكورسات الاحترافية",
  },
  diploma: {
    en: "Diplomas",
    ar: "الدبلومات",
  },
  other: {
    en: "Other",
    ar: "أخرى",
  },
};

export const REG_STUDENT_STATUS_LABELS: Record<
  RegStudentStatus,
  { en: string; ar: string; color: string }
> = {
  new: { en: "New", ar: "جديد", color: "bg-blue-100 text-blue-700" },
  enrolled: { en: "Enrolled", ar: "ملتحق", color: "bg-green-100 text-green-700" },
  cancelled: { en: "Cancelled", ar: "ملغي", color: "bg-red-100 text-red-700" },
};

/** Order categories are displayed in dropdowns and reports. */
export const REG_CATEGORY_ORDER: RegCourseCategory[] = [
  "esp",
  "exam_prep",
  "professional",
  "diploma",
  "other",
];

/** Ordered status pipeline for filters / reports. */
export const REG_STATUS_ORDER: RegStudentStatus[] = ["new", "enrolled", "cancelled"];

// ─── Route constants — single source of truth for navigation ─────────────────

export const REG_ROUTES = {
  // Agent
  registerStudent: "/registration/register-student",
  myStudents: "/registration/my-students",
  // Admin
  adminDashboard: "/registration/admin",
  adminStudents: "/registration/admin/students",
  adminAgents: "/registration/admin/agents",
  adminAgentNew: "/registration/admin/agents/new",
  adminCourses: "/registration/admin/courses",
  adminReports: "/registration/admin/reports",
} as const;

/**
 * Compute commission for a given fee using the current rate.
 * Returns 0 if fee is missing or non-positive (e.g. courses with TBD fees).
 */
export function computeCommission(fee: number, rate: number = ACCEPTIX_COMMISSION_RATE): number {
  if (!fee || fee <= 0) return 0;
  // Round to 3 decimals (KWD has 3 fils — finest local subunit).
  return Math.round(fee * rate * 1000) / 1000;
}
