/**
 * Registration module — report aggregation (client side).
 *
 * Computes monthly / arbitrary-range reports from `regStudents`. Filters
 * are applied at the Firestore layer where indexes exist, then the rest
 * is aggregated in memory.
 *
 * All money figures use the snapshotted `courseFee` and `commissionAmount`
 * from the regStudent record — never the live course price — so reports
 * stay reproducible even after a course is repriced.
 */

import { RegStudent } from "@/lib/types";
import { runQuery } from "@/lib/firebase/rest-helpers";
import {
  ACCEPTIX_COMMISSION_RATE,
  REG_DEFAULT_CURRENCY,
  computeCommission,
} from "@/lib/registration/constants";
import { commissionStatusOf } from "./reg-student-service";

export interface ReportFilters {
  /** Start of range — inclusive. */
  from: Date;
  /** End of range — inclusive. */
  to: Date;
  /** Optional agent uid filter. */
  agentUid?: string | "all";
  /** Optional course id filter. */
  courseId?: string | "all";
  /** Include soft-deleted? Default false. */
  includeDeleted?: boolean;
}

export interface AgentBreakdownRow {
  agentUid: string;
  agentName: string;
  studentCount: number;
  totalFees: number;
  totalCommission: number;
  /** Commission already paid out to the agent (snapshot sum of disbursed rows). */
  disbursedCommission: number;
  /** Commission still owed = totalCommission - disbursedCommission. */
  outstandingCommission: number;
  currency: string;
}

export interface CourseBreakdownRow {
  courseId: string;
  courseName: string;
  studentCount: number;
  totalFees: number;
  totalCommission: number;
  currency: string;
}

export interface ReportResult {
  students: RegStudent[];
  byAgent: AgentBreakdownRow[];
  byCourse: CourseBreakdownRow[];
  totals: {
    studentCount: number;
    totalFees: number;
    totalCommission: number;
    /** Sum of commission on rows marked disbursed. */
    disbursedCommission: number;
    /** Sum of commission still owed (pending). */
    outstandingCommission: number;
    currency: string;
  };
  range: { from: Date; to: Date };
  generatedAt: Date;
}

/**
 * Run a full report for the given range. Returns the raw rows + two
 * breakdowns + grand totals so the UI can render the report and any
 * exporter can serialize the same data without re-querying.
 */
export async function buildReport(filters: ReportFilters): Promise<ReportResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFilters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: "isDeleted" },
        op: "EQUAL",
        value: { booleanValue: filters.includeDeleted === true },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "createdAt" },
        op: "GREATER_THAN_OR_EQUAL",
        value: { timestampValue: filters.from.toISOString() },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "createdAt" },
        op: "LESS_THAN_OR_EQUAL",
        value: { timestampValue: filters.to.toISOString() },
      },
    },
  ];

  if (filters.agentUid && filters.agentUid !== "all") {
    whereFilters.push({
      fieldFilter: {
        field: { fieldPath: "createdBy" },
        op: "EQUAL",
        value: { stringValue: filters.agentUid },
      },
    });
  }

  if (filters.courseId && filters.courseId !== "all") {
    whereFilters.push({
      fieldFilter: {
        field: { fieldPath: "courseId" },
        op: "EQUAL",
        value: { stringValue: filters.courseId },
      },
    });
  }

  const structuredQuery = {
    from: [{ collectionId: "regStudents" }],
    where: { compositeFilter: { op: "AND", filters: whereFilters } },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
  };

  const students = (await runQuery(structuredQuery)) as RegStudent[];

  // ── Aggregate per agent + per course ─────────────────────────────────────
  const agentMap = new Map<string, AgentBreakdownRow>();
  const courseMap = new Map<string, CourseBreakdownRow>();
  let totalFees = 0;
  let totalCommission = 0;
  let disbursedCommission = 0;

  for (const s of students) {
    const fee = s.courseFee ?? 0;
    const commission = commissionAmount(s);
    const isDisbursed = commissionStatusOf(s) === "disbursed";
    const disbursed = isDisbursed ? commission : 0;
    const currency = s.currency || REG_DEFAULT_CURRENCY;

    totalFees += fee;
    totalCommission += commission;
    disbursedCommission += disbursed;

    // Agent
    const aRow = agentMap.get(s.createdBy);
    if (aRow) {
      aRow.studentCount++;
      aRow.totalFees += fee;
      aRow.totalCommission += commission;
      aRow.disbursedCommission += disbursed;
      aRow.outstandingCommission += commission - disbursed;
    } else {
      agentMap.set(s.createdBy, {
        agentUid: s.createdBy,
        agentName: s.createdByName || "—",
        studentCount: 1,
        totalFees: fee,
        totalCommission: commission,
        disbursedCommission: disbursed,
        outstandingCommission: commission - disbursed,
        currency,
      });
    }

    // Course
    const cRow = courseMap.get(s.courseId);
    if (cRow) {
      cRow.studentCount++;
      cRow.totalFees += fee;
      cRow.totalCommission += commission;
    } else {
      courseMap.set(s.courseId, {
        courseId: s.courseId,
        courseName: s.courseName || "—",
        studentCount: 1,
        totalFees: fee,
        totalCommission: commission,
        currency,
      });
    }
  }

  const byAgent = [...agentMap.values()].sort(
    (a, b) => b.studentCount - a.studentCount
  );
  const byCourse = [...courseMap.values()].sort(
    (a, b) => b.studentCount - a.studentCount
  );

  // Currency: use the first student's currency if mixed; in practice the
  // module is single-currency (KWD) but we keep the field for honesty.
  const currency = students[0]?.currency || REG_DEFAULT_CURRENCY;

  return {
    students,
    byAgent,
    byCourse,
    totals: {
      studentCount: students.length,
      totalFees,
      totalCommission,
      disbursedCommission,
      outstandingCommission: totalCommission - disbursedCommission,
      currency,
    },
    range: { from: filters.from, to: filters.to },
    generatedAt: new Date(),
  };
}

function commissionAmount(s: RegStudent): number {
  if (typeof s.commissionAmount === "number") return s.commissionAmount;
  return computeCommission(s.courseFee ?? 0, s.commissionRate ?? ACCEPTIX_COMMISSION_RATE);
}

// ─── Date range presets ─────────────────────────────────────────────────────

export interface DatePreset {
  id: string;
  labelAr: string;
  range(): { from: Date; to: Date };
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

export const REPORT_PRESETS: DatePreset[] = [
  {
    id: "this-month",
    labelAr: "هذا الشهر",
    range() {
      const now = new Date();
      return { from: startOfMonth(now), to: endOfDay(now) };
    },
  },
  {
    id: "last-month",
    labelAr: "الشهر اللي فات",
    range() {
      const now = new Date();
      const lastStart = startOfMonth(addMonths(now, -1));
      const lastEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { from: lastStart, to: lastEnd };
    },
  },
  {
    id: "last-3-months",
    labelAr: "آخر 3 شهور",
    range() {
      const now = new Date();
      return { from: startOfMonth(addMonths(now, -2)), to: endOfDay(now) };
    },
  },
  {
    id: "this-year",
    labelAr: "السنة دي",
    range() {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        to: endOfDay(now),
      };
    },
  },
  {
    id: "all-time",
    labelAr: "كل الوقت",
    range() {
      return {
        from: new Date(2020, 0, 1),
        to: endOfDay(new Date()),
      };
    },
  },
];
