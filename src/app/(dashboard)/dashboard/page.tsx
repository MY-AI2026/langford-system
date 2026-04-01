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
import {
  subscribeToStudents,
  subscribeToRecentActivities,
} from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { subscribeToCourses } from "@/lib/services/course-service";
import { Student, ActivityLogEntry, User, Course } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { userData, role, firebaseUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

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
    };
  }, [firebaseUser, role]);

  // ── Follow-up reminders — derived from students' activity (client-side) ─────
  const followUps = useMemo<FollowUpItem[]>(() => {
    // We can't easily get follow-ups from the activities list (limited to 20 recent)
    // so we return empty array — follow-ups will show when the collection group
    // index is available in the future
    return [];
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalStudents = students.filter((s) => s.status !== "lost").length;
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

  // Instructor view
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
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTargetProgress
          current={monthlyRevenue}
          target={userData?.monthlyTarget || 0}
        />
        <FollowUpRemindersWidget items={followUps} />
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
