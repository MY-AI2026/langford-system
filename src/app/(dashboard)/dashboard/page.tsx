"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyTargetProgress } from "@/components/dashboard/monthly-target-progress";
import { OverduePaymentsWidget } from "@/components/dashboard/overdue-payments-widget";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { FollowUpRemindersWidget, type FollowUpItem } from "@/components/dashboard/followup-reminders-widget";
import { Skeleton } from "@/components/ui/skeleton";

// Charts pull in recharts (a heavy dependency). Loading them lazily keeps the
// initial dashboard JS small so the page becomes interactive faster; each
// renders a skeleton placeholder until its chunk arrives.
const chartFallback = () => (
  <Skeleton className="h-[320px] w-full rounded-xl" />
);
const SalesLeaderboard = dynamic(
  () => import("@/components/dashboard/sales-leaderboard").then((m) => m.SalesLeaderboard),
  { loading: chartFallback },
);
const PipelineFunnel = dynamic(
  () => import("@/components/dashboard/pipeline-funnel").then((m) => m.PipelineFunnel),
  { loading: chartFallback },
);
const RevenueTrendChart = dynamic(
  () => import("@/components/dashboard/revenue-trend-chart").then((m) => m.RevenueTrendChart),
  { loading: chartFallback },
);
const LeadSourceChart = dynamic(
  () => import("@/components/dashboard/lead-source-chart").then((m) => m.LeadSourceChart),
  { loading: chartFallback },
);
const CourseEnrollmentChart = dynamic(
  () => import("@/components/dashboard/course-enrollment-chart").then((m) => m.CourseEnrollmentChart),
  { loading: chartFallback },
);
import {
  subscribeToStudents,
  subscribeToRecentActivities,
} from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { subscribeToCourses } from "@/lib/services/course-service";
import { subscribeToEmbassyPayments } from "@/lib/services/embassy-payment-service";
import { getCollectedTotalByUser } from "@/lib/services/payment-service";
import { Student, ActivityLogEntry, User, Course, EmbassyPayment } from "@/lib/types";
import { followUpThresholdDays } from "@/lib/utils/followups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Users, ClipboardCheck, CalendarDays, GraduationCap } from "lucide-react";
import Link from "next/link";

function currentMonthValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { userData, role, firebaseUser } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [embassyPayments, setEmbassyPayments] = useState<EmbassyPayment[]>([]);
  // "all" = all-time (no month scoping).
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const didInitMonth = useRef(false);

  // The month picker + scoped figures apply to admin, accountant, and sales.
  const useMonthFilter =
    role === "admin" || role === "accountant" || role === "sales";
  const isAllTime = selectedMonth === "all";
  const isCurrentMonth = selectedMonth === currentMonthValue();

  // Per-role default, set once role resolves: sales + accountant → current
  // month (their dashboard is month-by-month and resets on the 1st); admin →
  // all-time (full picture by default, can still pick a month).
  useEffect(() => {
    if (!role || didInitMonth.current) return;
    didInitMonth.current = true;
    if (role === "sales" || role === "accountant") {
      setSelectedMonth(currentMonthValue());
    }
  }, [role]);

  // Sales: amount this rep actually COLLECTED in the selected month, summed by
  // payment date (not by when the student was added). This is the figure that
  // resets each month. Fetched via a collection-group query over payments.
  const [collectedThisMonth, setCollectedThisMonth] = useState<number>(0);
  useEffect(() => {
    if (role !== "sales" || !firebaseUser || isAllTime) {
      setCollectedThisMonth(0);
      return;
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return;
    // Build the range in UTC so it lines up with how paymentDate is stored
    // (date-only inputs are saved as UTC midnight); avoids off-by-3h drift in
    // Kuwait near month boundaries.
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    let cancelled = false;
    getCollectedTotalByUser(firebaseUser.uid, start, end)
      .then((total) => {
        if (!cancelled) setCollectedThisMonth(total);
      })
      .catch(() => {
        if (!cancelled) setCollectedThisMonth(0);
      });
    return () => {
      cancelled = true;
    };
  }, [role, firebaseUser, selectedMonth, isAllTime]);

  useEffect(() => {
    if (!firebaseUser || !role) return;

    // Real-time students subscription
    const unsubStudents = subscribeToStudents(
      { role, userId: firebaseUser.uid },
      setStudents
    );

    // Real-time activity feed (admin only)
    const unsubActivities =
      role === "admin" ? subscribeToRecentActivities(setActivities) : () => {};

    // Embassy payments (admin, accountant, sales — for IELTS net view)
    const unsubEmbassy = subscribeToEmbassyPayments(setEmbassyPayments);

    // Load sales users for leaderboard (admin only, one-time)
    if (role === "admin") {
      getSalesUsers().then(setSalesUsers).catch(console.error);
    }

    // Load all courses for admin/coordinator charts
    let unsubAllCourses = () => {};
    if (role === "admin" || role === "coordinator") {
      unsubAllCourses = subscribeToCourses((data) => {
        setAllCourses(data.filter((c) => c.isActive));
      });
    }

    // Instructor: load courses
    let unsubCourses = () => {};
    if (role === "instructor") {
      unsubCourses = subscribeToCourses((data) => {
        // Filter to instructor's assigned courses
        setCourses(
          data.filter(
            (c) => c.isActive && c.instructorId === firebaseUser.uid
          )
        );
      });
    }

    return () => {
      unsubStudents();
      unsubActivities();
      unsubCourses();
      unsubAllCourses();
      unsubEmbassy();
    };
  }, [firebaseUser, role]);

  // ── Month-filtered students for sales/accountant scoped metrics ────────
  const monthStudents = useMemo<Student[]>(() => {
    if (!useMonthFilter || selectedMonth === "all") return students;
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return students;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    return students.filter((s) => {
      try {
        const created = s.createdAt?.toDate?.();
        if (!created) return false;
        return created >= monthStart && created < monthEnd;
      } catch {
        return false;
      }
    });
  }, [students, selectedMonth, useMonthFilter]);

  const monthEmbassyPayments = useMemo<EmbassyPayment[]>(() => {
    if (!useMonthFilter || selectedMonth === "all") return embassyPayments;
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return embassyPayments;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    return embassyPayments.filter((p) => {
      try {
        const created = p.createdAt?.toDate?.();
        if (!created) return false;
        return created >= monthStart && created < monthEnd;
      } catch {
        return false;
      }
    });
  }, [embassyPayments, selectedMonth, useMonthFilter]);

  // ── Follow-up reminders — derived from stale students (client-side) ─────
  const followUps = useMemo<FollowUpItem[]>(() => {
    const now = new Date();
    const items: FollowUpItem[] = [];

    for (const s of students) {
      // Skip archived, paid, enrolled, or lost students
      if (s.isArchived || s.status === "paid" || s.status === "lost") continue;

      try {
        const updated = s.updatedAt?.toDate?.() ??
          (typeof s.updatedAt === "string" ? new Date(s.updatedAt as unknown as string) : null);
        if (!updated) continue;

        const daysSinceUpdate = Math.floor(
          (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Flag students not touched past their status threshold (shared with
        // the sidebar follow-up badge so the two never disagree).
        const threshold = followUpThresholdDays(s.status);
        if (daysSinceUpdate >= threshold) {
          const isOverdue = daysSinceUpdate > threshold + 2;
          items.push({
            id: s.id,
            studentId: s.id,
            studentName: s.fullName,
            description: `${t("noUpdateFor")} ${daysSinceUpdate} ${t("days")} (${s.status})`,
            followUpDate: updated.toISOString(),
            createdByName: s.assignedSalesRepName || "",
            isOverdue,
          });
        }
      } catch {
        /* skip */
      }
    }

    // Sort: overdue first, then by date ascending
    return items
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
      })
      .slice(0, 10);
  }, [students]);

  // ── Month-over-month trends (current calendar month vs previous) ───────────
  // Based on createdAt, independent of the month picker, so each card shows
  // real momentum. A trend is hidden when the prior month had no baseline.
  const trends = useMemo(() => {
    const toDateSafe = (v: unknown): Date | null => {
      try {
        const d = (v as { toDate?: () => Date })?.toDate?.();
        if (d) return d;
        if (typeof v === "string") return new Date(v);
        if (v instanceof Date) return v;
      } catch {
        /* ignore */
      }
      return null;
    };
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const inRange = (d: Date | null, s: Date, e: Date) => !!d && d >= s && d < e;

    let curCount = 0,
      prevCount = 0,
      curRev = 0,
      prevRev = 0,
      curIelts = 0,
      prevIelts = 0;
    for (const s of students) {
      const c = toDateSafe(s.createdAt);
      if (inRange(c, curStart, curEnd)) {
        if (s.status !== "lost") curCount++;
        curRev += s.paymentSummary?.amountPaid ?? 0;
        curIelts += s.ieltsSummary?.totalPaid ?? 0;
      } else if (inRange(c, prevStart, curStart)) {
        if (s.status !== "lost") prevCount++;
        prevRev += s.paymentSummary?.amountPaid ?? 0;
        prevIelts += s.ieltsSummary?.totalPaid ?? 0;
      }
    }
    const mk = (cur: number, prev: number) =>
      prev > 0
        ? { value: ((cur - prev) / prev) * 100, positive: cur >= prev }
        : undefined;
    return {
      studentsTrend: mk(curCount, prevCount),
      revenueTrend: mk(curRev, prevRev),
      ieltsTrend: mk(curIelts, prevIelts),
    };
  }, [students]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  // monthStudents is scoped to the selected month for sales/accountant; for admin
  // (or when filter is off) it falls back to the full students list.
  const totalStudents = monthStudents.filter((s) => s.status !== "lost").length;
  const ieltsRevenue = monthStudents.reduce(
    (sum, s) => sum + (s.ieltsSummary?.totalPaid ?? 0),
    0
  );
  const ieltsBookingsCount = monthStudents.filter(
    (s) => (s.ieltsSummary?.paymentsCount ?? 0) > 0
  ).length;
  const embassyPaid = monthEmbassyPayments.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );
  // Sales see what they actually collected this month (by payment date, via
  // collectedThisMonth). Admin/accountant keep the student-creation-scoped sum.
  const totalRevenue =
    role === "sales" && !isAllTime
      ? collectedThisMonth
      : monthStudents.reduce(
          (sum, s) => sum + (s.paymentSummary?.amountPaid ?? 0),
          0
        );
  // Pending balance is intentionally NOT month-filtered — sales must still see
  // outstanding amounts from prior months so they can collect them.
  const pendingPayments = students.reduce(
    (sum, s) => sum + (s.paymentSummary?.remainingBalance ?? 0),
    0
  );
  const enrolledOrPaid = monthStudents.filter(
    (s) => s.status === "enrolled" || s.status === "paid"
  ).length;
  const conversionRate =
    totalStudents > 0 ? (enrolledOrPaid / totalStudents) * 100 : 0;

  // Monthly revenue progress: when a month filter is active, the month's
  // totalRevenue already represents the month-scoped figure; for admin
  // (no filter) we keep the legacy current-calendar-month calculation.
  const monthlyRevenue = useMonthFilter && !isAllTime
    ? totalRevenue
    : (() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return students.reduce((sum, s) => {
          try {
            if (s.createdAt && s.createdAt.toDate() >= monthStart) {
              return sum + (s.paymentSummary?.amountPaid ?? 0);
            }
          } catch { /* ignore */ }
          return sum;
        }, 0);
      })();

  // ── Instructor view ──────────────────────────────────────────────────────────
  if (role === "instructor") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`${t("welcomeBack")}, ${userData?.displayName || t("user")}`}
          description={t("teachingDashboard")}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("myCourses")}</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("totalStudents")}</p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Link href="/attendance" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("takeAttendance")}</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:underline">{t("goToAttendance")}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* My Courses list */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t("myCourses")}</h3>
          {courses.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">{t("noCoursesAssigned")}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <Card key={course.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{course.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {course.level && <Badge variant="outline">{course.level}</Badge>}
                        {course.duration && (
                          <span className="text-xs text-muted-foreground">{course.duration}</span>
                        )}
                      </div>
                      <Link
                        href="/attendance"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {t("takeAttendance")}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Coordinator view ─────────────────────────────────────────────────────────
  if (role === "coordinator") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`${t("welcomeBack")}, ${userData?.displayName || t("user")}`}
          description={t("coordinationDashboard")}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("totalStudents")}
              </CardTitle>
              <div className="rounded-lg p-2 bg-blue-50">
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("activeCourses")}
              </CardTitle>
              <div className="rounded-lg p-2 bg-green-50">
                <BookOpen className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{allCourses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("enrolled")}
              </CardTitle>
              <div className="rounded-lg p-2 bg-emerald-50">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{enrolledOrPaid}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Link href="/schedule" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <CalendarDays className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("schedule")}</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:underline">{t("manageSchedule")}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PipelineFunnel students={students} />
          <CourseEnrollmentChart students={students} courses={allCourses} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LeadSourceChart students={students} />
          <FollowUpRemindersWidget items={followUps} />
        </div>
      </div>
    );
  }

  // ── Admin / Sales / Accountant view ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("welcomeBack")}, ${userData?.displayName || t("user")}`}
        description={
          role === "admin"
            ? t("adminDashboardDesc")
            : t("personalDashboardDesc")
        }
      />

      {useMonthFilter && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Label htmlFor="dashboard-month" className="text-sm">
              {t("showDataFor")}
            </Label>
            <Input
              id="dashboard-month"
              type="month"
              value={isAllTime ? "" : selectedMonth}
              max={currentMonthValue()}
              onChange={(e) =>
                setSelectedMonth(e.target.value ? e.target.value : "all")
              }
              className="w-auto"
            />
            <Badge variant={isAllTime ? "default" : "secondary"}>
              {isAllTime
                ? t("allTimeFull")
                : isCurrentMonth
                  ? t("currentMonth")
                  : formatMonthLabel(selectedMonth)}
            </Badge>
            {!isAllTime && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMonth("all")}
              >
                {t("showAllFullAmount")}
              </Button>
            )}
            {isAllTime && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMonth(currentMonthValue())}
              >
                {t("viewCurrentMonth")}
              </Button>
            )}
            <p className="text-xs text-muted-foreground w-full sm:w-auto sm:ms-auto">
              {isAllTime
                ? t("allTimeTotalsHint")
                : t("outstandingAcrossMonthsHint")}
            </p>
          </CardContent>
        </Card>
      )}

      <StatsCards
        totalStudents={totalStudents}
        totalRevenue={totalRevenue}
        pendingPayments={pendingPayments}
        conversionRate={conversionRate}
        ieltsRevenue={ieltsRevenue}
        ieltsBookingsCount={ieltsBookingsCount}
        embassyPaid={embassyPaid}
        studentsTrend={trends.studentsTrend}
        revenueTrend={trends.revenueTrend}
        ieltsTrend={trends.ieltsTrend}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTargetProgress
          current={monthlyRevenue}
          target={userData?.monthlyTarget || 0}
        />
        <FollowUpRemindersWidget items={followUps} />
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineFunnel students={monthStudents} />
        {/* Trend uses the full list so the 6-month history stays visible even
            when the month filter resets the headline counters each month. */}
        <RevenueTrendChart students={students} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadSourceChart students={monthStudents} />
        {(role === "admin") && (
          <CourseEnrollmentChart students={monthStudents} courses={allCourses} />
        )}
      </div>

      <div className={`grid gap-6 ${role === "admin" ? "lg:grid-cols-2" : ""}`}>
        {/* Overdue widget intentionally uses the full list — must show all unpaid */}
        <OverduePaymentsWidget students={students} />
        {role === "admin" && salesUsers.length > 0 && (
          <SalesLeaderboard students={students} salesUsers={salesUsers} />
        )}
      </div>

      <RecentActivityFeed activities={activities} />
    </div>
  );
}
