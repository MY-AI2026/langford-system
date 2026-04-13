"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyTargetProgress } from "@/components/dashboard/monthly-target-progress";
import { OverduePaymentsWidget } from "@/components/dashboard/overdue-payments-widget";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { FollowUpRemindersWidget, type FollowUpItem } from "@/components/dashboard/followup-reminders-widget";
import { SalesLeaderboard } from "@/components/dashboard/sales-leaderboard";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { LeadSourceChart } from "@/components/dashboard/lead-source-chart";
import { CourseEnrollmentChart } from "@/components/dashboard/course-enrollment-chart";
import {
  subscribeToStudents,
  subscribeToRecentActivities,
} from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { subscribeToCourses } from "@/lib/services/course-service";
import { Student, ActivityLogEntry, User, Course } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ClipboardCheck, CalendarDays, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { userData, role, firebaseUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

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
    };
  }, [firebaseUser, role]);

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

        // Flag students not touched in 3+ days (lead/contacted) or 7+ days (evaluated/enrolled)
        const threshold = s.status === "lead" || s.status === "contacted" ? 3 : 7;
        if (daysSinceUpdate >= threshold) {
          const isOverdue = daysSinceUpdate > threshold + 2;
          items.push({
            id: s.id,
            studentId: s.id,
            studentName: s.fullName,
            description: `No update for ${daysSinceUpdate} days (${s.status})`,
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

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalStudents = students.filter((s) => s.status !== "lost").length;
  const ieltsRevenue = students.reduce(
    (sum, s) => sum + (s.ieltsSummary?.totalPaid ?? 0),
    0
  );
  const ieltsBookingsCount = students.filter(
    (s) => (s.ieltsSummary?.paymentsCount ?? 0) > 0
  ).length;
  const totalRevenue = students.reduce(
    (sum, s) => sum + (s.paymentSummary?.amountPaid ?? 0),
    0
  );
  const pendingPayments = students.reduce(
    (sum, s) => sum + (s.paymentSummary?.remainingBalance ?? 0),
    0
  );
  const enrolledOrPaid = students.filter(
    (s) => s.status === "enrolled" || s.status === "paid"
  ).length;
  const conversionRate =
    totalStudents > 0 ? (enrolledOrPaid / totalStudents) * 100 : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = students.reduce((sum, s) => {
    try {
      if (s.createdAt && s.createdAt.toDate() >= monthStart) {
        return sum + (s.paymentSummary?.amountPaid ?? 0);
      }
    } catch { /* ignore */ }
    return sum;
  }, 0);

  // ── Instructor view ──────────────────────────────────────────────────────────
  if (role === "instructor") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${userData?.displayName || "User"}`}
          description="Your teaching dashboard"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Courses</p>
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
                  <p className="text-sm text-muted-foreground">Total Students</p>
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
                  <p className="text-sm text-muted-foreground">Take Attendance</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:underline">Go to Attendance</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* My Courses list */}
        <div>
          <h3 className="text-lg font-semibold mb-3">My Courses</h3>
          {courses.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">No courses assigned yet</p>
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
                        Take Attendance
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
          title={`Welcome back, ${userData?.displayName || "User"}`}
          description="Course coordination dashboard"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
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
                Active Courses
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
                Enrolled
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
                  <p className="text-sm text-muted-foreground">Schedule</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:underline">Manage Schedule</p>
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

  // ── Admin / Sales view ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userData?.displayName || "User"}`}
        description={
          role === "admin"
            ? "Overview of all sales and student activities"
            : "Your personal performance dashboard"
        }
      />

      <StatsCards
        totalStudents={totalStudents}
        totalRevenue={totalRevenue}
        pendingPayments={pendingPayments}
        conversionRate={conversionRate}
        ieltsRevenue={ieltsRevenue}
        ieltsBookingsCount={ieltsBookingsCount}
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
        <PipelineFunnel students={students} />
        <RevenueTrendChart students={students} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadSourceChart students={students} />
        {(role === "admin") && (
          <CourseEnrollmentChart students={students} courses={allCourses} />
        )}
      </div>

      <div className={`grid gap-6 ${role === "admin" ? "lg:grid-cols-2" : ""}`}>
        <OverduePaymentsWidget students={students} />
        {role === "admin" && salesUsers.length > 0 && (
          <SalesLeaderboard students={students} salesUsers={salesUsers} />
        )}
      </div>

      <RecentActivityFeed activities={activities} />
    </div>
  );
}
