"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToCourses } from "@/lib/services/course-service";
import { subscribeToEnrollments } from "@/lib/services/enrollment-service";
import { addSession } from "@/lib/services/attendance-service";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Course, Enrollment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, Clock, Save } from "lucide-react";
import { toast } from "sonner";

type AttendanceStatus = "present" | "absent" | "late";

interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  status: AttendanceStatus;
}

function AttendanceContent() {
  const { firebaseUser, role } = useAuth();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [saving, setSaving] = useState(false);

  // Load courses
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeToCourses((data) => {
      // Instructors see their assigned courses; admins see all active
      if (role === "instructor") {
        setCourses(
          data.filter((c) => c.isActive && c.instructorId === firebaseUser.uid)
        );
      } else {
        setCourses(data.filter((c) => c.isActive));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseUser, role]);

  // Auto-select course from URL query param
  useEffect(() => {
    if (courseIdParam && courses.length > 0 && !autoSelected) {
      const course = courses.find((c) => c.id === courseIdParam);
      if (course) {
        setSelectedCourse(course);
        setAutoSelected(true);
      }
    }
  }, [courseIdParam, courses, autoSelected]);

  // When a course is selected, we need to find students enrolled in that course.
  // We subscribe to enrollments for each student, but that's per-student.
  // A simpler approach: use REST query to find enrollments matching the courseId.
  // For now, we'll use a simplified approach.
  useEffect(() => {
    if (!selectedCourse) {
      setEnrollments([]);
      setRecords([]);
      return;
    }
    setLoadingEnrollments(true);

    // We need to query enrollments across all students for this course.
    // Since the enrollment service is per-student, we'll use a REST query approach.
    async function loadEnrollmentsForCourse() {
      try {
        const { runQuery } = await import("@/lib/firebase/rest-helpers");
        const structuredQuery = {
          from: [{ collectionId: "enrollments", allDescendants: true }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "courseId" },
                    op: "EQUAL",
                    value: { stringValue: selectedCourse!.id },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "active" },
                  },
                },
              ],
            },
          },
        };
        const results = (await runQuery(structuredQuery)) as Enrollment[];
        setEnrollments(results);

        // Initialize attendance records
        // We need student names. The enrollment has studentId but we need to
        // fetch student names. For simplicity, we'll use the document path approach.
        // Actually, let's also query students
        const { fetchDoc } = await import("@/lib/firebase/rest-helpers");
        const studentRecords: StudentAttendanceRecord[] = [];
        for (const enr of results) {
          let studentName = "Unknown Student";
          try {
            const studentDoc = await fetchDoc(`students/${enr.studentId}`);
            if (studentDoc) {
              studentName = studentDoc.fullName || "Unknown Student";
            }
          } catch {
            // ignore
          }
          studentRecords.push({
            studentId: enr.studentId,
            studentName,
            enrollmentId: enr.id,
            status: "present",
          });
        }
        setRecords(studentRecords);
      } catch (e) {
        console.error("Failed to load enrollments:", e);
        toast.error("Failed to load enrolled students");
      } finally {
        setLoadingEnrollments(false);
      }
    }

    loadEnrollmentsForCourse();
  }, [selectedCourse]);

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  }

  async function handleSaveAttendance() {
    if (!attendanceDate) {
      toast.error("Please select a date");
      return;
    }
    if (records.length === 0) {
      toast.error("No students to record attendance for");
      return;
    }

    setSaving(true);
    try {
      const date = new Date(attendanceDate);
      for (const record of records) {
        await addSession(
          record.studentId,
          date,
          record.status === "present" || record.status === "late"
        );
      }
      toast.success("Attendance saved for all students");
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Course selection view
  if (!selectedCourse) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select a Course</h3>
        {courses.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No courses assigned yet
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedCourse(course)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {course.level && <Badge variant="outline">{course.level}</Badge>}
                    {course.duration && (
                      <span className="text-xs text-muted-foreground">
                        {course.duration}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Attendance taking view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedCourse(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold">{selectedCourse.name}</h3>
          <p className="text-sm text-muted-foreground">Take Attendance</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>
        <div className="pt-5">
          <Button onClick={handleSaveAttendance} disabled={saving || records.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>

      {loadingEnrollments ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            No students enrolled in this course
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.studentId}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <span className="text-sm font-medium">{record.studentName}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={record.status === "present" ? "default" : "outline"}
                  onClick={() => updateStatus(record.studentId, "present")}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" />
                  Present
                </Button>
                <Button
                  size="sm"
                  variant={record.status === "absent" ? "destructive" : "outline"}
                  onClick={() => updateStatus(record.studentId, "absent")}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Absent
                </Button>
                <Button
                  size="sm"
                  variant={record.status === "late" ? "secondary" : "outline"}
                  onClick={() => updateStatus(record.studentId, "late")}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Late
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <RoleGate allowedRoles={["admin", "instructor"]}>
      <div className="space-y-6">
        <PageHeader
          title="Take Attendance"
          description="Record student attendance for your courses"
        />
        <AttendanceContent />
      </div>
    </RoleGate>
  );
}
