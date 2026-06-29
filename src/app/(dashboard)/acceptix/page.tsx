"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import { subscribeToAllStudents, commissionFor } from "@/lib/services/reg-student-service";
import { subscribeToActiveCourses } from "@/lib/services/reg-course-service";
import { subscribeToAcceptixAgents } from "@/lib/services/reg-agent-service";
import { RegStudent, RegCourse, User } from "@/lib/types";
import {
  REG_ROUTES,
  REG_STUDENT_STATUS_LABELS,
  REG_DEFAULT_CURRENCY,
} from "@/lib/registration/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  GraduationCap,
  TrendingUp,
  CalendarDays,
  ArrowRight,
  UserPlus,
  BookOpen,
  FileBarChart,
} from "lucide-react";

function AcceptixAdminDashboardContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const [students, setStudents] = useState<RegStudent[]>([]);
  const [courses, setCourses] = useState<RegCourse[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllStudents({}, (data) => {
      setStudents(data);
      setLoadingStudents(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToActiveCourses((data) => {
      setCourses(data);
      setLoadingCourses(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToAcceptixAgents((data) => {
      setAgents(data);
      setLoadingAgents(false);
    });
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const total = students.length;
    const monthStart = startOfMonth(new Date());
    let thisMonth = 0;
    let totalCommission = 0;
    const perCourse = new Map<string, number>();
    for (const s of students) {
      const created = toDate(s.createdAt);
      if (created && created >= monthStart) thisMonth++;
      totalCommission += commissionFor(s);
      perCourse.set(s.courseName, (perCourse.get(s.courseName) ?? 0) + 1);
    }
    let topCourse: { name: string; count: number } | null = null;
    for (const [name, count] of perCourse) {
      if (!topCourse || count > topCourse.count) topCourse = { name, count };
    }
    return {
      total,
      thisMonth,
      activeAgents: agents.filter((a) => a.isActive !== false).length,
      totalCommission,
      topCourse,
    };
  }, [students, agents]);

  const recent = useMemo(() => students.slice(0, 10), [students]);

  return (
    <div className="space-y-6" dir="ltr">
      {/* Branded header — dual logo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/acceptix-logo.png"
            alt="Acceptix"
            width={56}
            height={56}
            className="rounded-md"
            priority
          />
          <div>
            <h1 className="text-2xl font-semibold">{t("acceptixAdmin")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("acceptixAdminSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("poweredBy")}</span>
          <Image src="/logo.png" alt="Langford" width={28} height={28} />
          <span className="font-medium">Langford</span>
        </div>
      </div>

      {/* Quick actions — the primary entry points for the Acceptix admin */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href={REG_ROUTES.adminAgentNew}
          icon={UserPlus}
          label={t("addNewAgent")}
          description={t("addNewAgentDesc")}
          tone="primary"
        />
        <QuickAction
          href={REG_ROUTES.adminAgents}
          icon={Users}
          label={t("manageAgents")}
          description={t("manageAgentsDesc")}
        />
        <QuickAction
          href={REG_ROUTES.adminCourses}
          icon={BookOpen}
          label={t("manageCourses")}
          description={t("manageCoursesDesc")}
        />
        <QuickAction
          href={REG_ROUTES.adminReports}
          icon={FileBarChart}
          label={t("reports")}
          description={t("reportsQuickDesc")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          loading={loadingStudents}
          icon={Users}
          label={t("totalRegistrations")}
          value={stats.total.toLocaleString("en-US")}
        />
        <StatCard
          loading={loadingStudents}
          icon={CalendarDays}
          label={t("thisMonth")}
          value={stats.thisMonth.toLocaleString("en-US")}
        />
        <StatCard
          loading={loadingAgents}
          icon={Users}
          label={t("activeAgents")}
          value={stats.activeAgents.toLocaleString("en-US")}
        />
        <StatCard
          loading={loadingStudents}
          icon={TrendingUp}
          label={t("totalCommission")}
          value={`${stats.totalCommission.toLocaleString("en-US")} ${REG_DEFAULT_CURRENCY}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {t("topCourse")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <Skeleton className="h-7 w-3/4" />
            ) : stats.topCourse ? (
              <>
                <p className="text-lg font-semibold">{stats.topCourse.name}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.topCourse.count.toLocaleString("en-US")} {t("studentsLower")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noRegistrationsYet")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {t("availableCourses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCourses ? (
              <Skeleton className="h-7 w-1/2" />
            ) : (
              <>
                <p className="text-lg font-semibold">
                  {courses.length.toLocaleString("en-US")} {t("coursesLower")}
                </p>
                <Link
                  href={REG_ROUTES.adminCourses}
                  className="text-sm text-primary hover:underline"
                >
                  {t("manageCoursesLink")}
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("recentRegistrations")}</CardTitle>
            <Link
              href={REG_ROUTES.adminStudents}
              className="text-sm text-primary hover:underline"
            >
              {t("viewAll")}
              <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noRegistrationsYet")}
            </p>
          ) : (
            <div className="divide-y">
              {recent.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(REG_ROUTES.adminStudents)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.courseName} · {s.createdByName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`border-0 ${REG_STUDENT_STATUS_LABELS[s.status].color}`}
                    >
                      {REG_STUDENT_STATUS_LABELS[s.status].en}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-2/3" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  tone = "default",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  tone?: "default" | "primary";
}) {
  const isPrimary = tone === "primary";
  return (
    <Link
      href={href}
      className={[
        "group flex flex-col gap-2 rounded-lg border p-4 transition-colors",
        isPrimary
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "hover:bg-muted/50",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            "rounded-md p-1.5",
            isPrimary ? "bg-primary text-primary-foreground" : "bg-muted",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={[
            "text-sm font-semibold",
            isPrimary ? "text-primary" : "",
          ].join(" ")}
        >
          {label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AcceptixAdminDashboardPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <AcceptixAdminDashboardContent />
    </RoleGate>
  );
}
