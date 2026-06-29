"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { subscribeToCourses } from "@/lib/services/course-service";
import { subscribeToEnrollments } from "@/lib/services/enrollment-service";
import { recordAttendance } from "@/lib/services/attendance-service";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Course, Enrollment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, Clock, Save, Printer } from "lucide-react";
import { toast } from "sonner";

type AttendanceStatus = "present" | "absent" | "late";

/** Escape user-provided text before injecting it into the print window HTML. */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  status: AttendanceStatus;
}

function AttendanceContent() {
  const { firebaseUser, role } = useAuth();
  const { t } = useLanguage();
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
        const { runQuery, fetchDoc } = await import("@/lib/firebase/rest-helpers");
        // SIMPLIFIED QUERY - filter only by courseId to avoid composite index requirement.
        // Status filter is applied client-side.
        // Collection group query on `enrollments` returns docs from all students.
        // The REST endpoint for a root collection-group query is :runQuery at the root
        // with `allDescendants: true`. We also need the server to resolve document paths,
        // so we additionally extract studentId from the document path.
        const structuredQuery = {
          from: [{ collectionId: "enrollments", allDescendants: true }],
          where: {
            fieldFilter: {
              field: { fieldPath: "courseId" },
              op: "EQUAL",
              value: { stringValue: selectedCourse!.id },
            },
          },
        };

        // runQuery parses document data, but loses the parent path (studentId).
        // We call the REST endpoint directly to preserve `document.name` so we can
        // extract studentId from the path: students/{studentId}/enrollments/{id}
        const { auth } = await import("@/lib/firebase/config");
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ structuredQuery }),
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("[attendance] enrollments query failed:", res.status);
          setEnrollments([]);
          setRecords([]);
          return;
        }

        const rawResults = await res.json();
        const parseValue = (v: unknown): unknown => {
          if (v === null || v === undefined) return null;
          const val = v as Record<string, unknown>;
          if ("stringValue" in val) return val.stringValue;
          if ("integerValue" in val) return Number(val.integerValue);
          if ("doubleValue" in val) return val.doubleValue;
          if ("booleanValue" in val) return val.booleanValue;
          if ("nullValue" in val) return null;
          if ("timestampValue" in val) return val.timestampValue;
          if ("mapValue" in val) {
            const fields = (val.mapValue as Record<string, Record<string, unknown>>)?.fields || {};
            const out: Record<string, unknown> = {};
            for (const [k, vv] of Object.entries(fields)) out[k] = parseValue(vv);
            return out;
          }
          return null;
        };

        type RawDoc = {
          document?: {
            name: string;
            fields?: Record<string, Record<string, unknown>>;
          };
        };

        const activeEnrollments: Array<Enrollment & { _studentId: string }> = [];
        const seenStudentIds = new Set<string>();
        for (const r of rawResults as RawDoc[]) {
          if (!r.document) continue;
          const pathParts = r.document.name.split("/");
          // path: projects/.../documents/students/{studentId}/enrollments/{id}
          const studentsIdx = pathParts.indexOf("students");
          const studentId = studentsIdx >= 0 ? pathParts[studentsIdx + 1] : "";
          const id = pathParts[pathParts.length - 1];
          const fields = r.document.fields || {};
          const parsed: Record<string, unknown> = { id };
          for (const [k, v] of Object.entries(fields)) parsed[k] = parseValue(v);

          // Client-side filter for active status
          if (parsed.status !== "active") continue;

          // De-duplicate: a student with several active enrollments in the
          // same course (data anomaly) must appear only once on the roster.
          if (!studentId || seenStudentIds.has(studentId)) continue;
          seenStudentIds.add(studentId);

          activeEnrollments.push({ ...(parsed as unknown as Enrollment), _studentId: studentId });
        }

        setEnrollments(activeEnrollments as Enrollment[]);

        // Fetch student names in parallel
        const studentRecords: StudentAttendanceRecord[] = await Promise.all(
          activeEnrollments.map(async (enr) => {
            let studentName = t("unknownStudent");
            try {
              const studentDoc = await fetchDoc(`students/${enr._studentId}`);
              if (studentDoc) {
                studentName = studentDoc.fullName || t("unknownStudent");
              }
            } catch {
              // ignore
            }
            return {
              studentId: enr._studentId,
              studentName,
              enrollmentId: enr.id,
              status: "present" as AttendanceStatus,
            };
          })
        );
        setRecords(studentRecords);
      } catch (e) {
        console.error("Failed to load enrollments:", e);
        toast.error(t("failedToLoadStudents"));
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
      toast.error(t("pleaseSelectDate"));
      return;
    }
    if (records.length === 0) {
      toast.error(t("noStudentsToRecord"));
      return;
    }

    setSaving(true);
    try {
      const date = new Date(attendanceDate);
      const results = await Promise.allSettled(
        records.map((record) =>
          recordAttendance(
            record.studentId,
            date,
            record.status,
            selectedCourse?.id
          )
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(t("attendanceSavedAll"));
      } else {
        toast.warning(
          `${t("saved")} ${records.length - failed} ${t("of")} ${records.length}. ${failed} ${t("failedTryAgain")}`
        );
      }
    } catch {
      toast.error(t("failedToSaveAttendance"));
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (!selectedCourse || records.length === 0) {
      toast.error(t("nothingToPrint"));
      return;
    }

    const dateLabel = attendanceDate
      ? new Date(attendanceDate).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;

    const mark = (on: boolean) =>
      on
        ? '<span style="font-weight:700;color:#000">✓</span>'
        : "";

    const rows = records
      .map(
        (r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name">${escapeHtml(r.studentName)}</td>
          <td class="mark">${mark(r.status === "present")}</td>
          <td class="mark">${mark(r.status === "absent")}</td>
          <td class="mark">${mark(r.status === "late")}</td>
          <td class="sign"></td>
        </tr>`
      )
      .join("");

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Attendance — ${escapeHtml(
      selectedCourse.name
    )}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#111;padding:32px 36px}
  .head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #C8242E;padding-bottom:14px;margin-bottom:18px}
  .head img{height:48px}
  .head .t{text-align:right}
  .head .t h1{font-size:20px;font-weight:800}
  .head .t p{font-size:12px;color:#666;margin-top:2px}
  .meta{display:flex;gap:28px;flex-wrap:wrap;margin-bottom:16px;font-size:13px}
  .meta b{color:#000}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border:1px solid #cfcfcf;padding:8px 10px}
  th{background:#111;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
  td.num{width:36px;text-align:center;color:#666}
  td.name{font-weight:600}
  td.mark{width:70px;text-align:center;font-size:15px}
  td.sign{width:150px}
  tr:nth-child(even) td{background:#fafafa}
  .totals{display:flex;gap:20px;margin-top:16px;font-size:13px}
  .totals .box{border:1px solid #ddd;border-radius:6px;padding:8px 14px}
  .totals .box b{display:block;font-size:18px}
  .foot{display:flex;justify-content:space-between;margin-top:48px;font-size:13px;color:#333}
  .foot .line{border-top:1px solid #999;width:220px;padding-top:6px;text-align:center}
  @media print{body{padding:0}}
</style></head>
<body>
  <div class="head">
    <img src="${origin}/logo.png" alt="Langford">
    <div class="t"><h1>Attendance Sheet</h1><p>Langford International Institute · Kuwait</p></div>
  </div>
  <div class="meta">
    <div><b>Course:</b> ${escapeHtml(selectedCourse.name)}</div>
    <div><b>Date:</b> ${dateLabel}</div>
    <div><b>Students:</b> ${records.length}</div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th style="text-align:left">Student Name</th>
      <th>Present</th><th>Absent</th><th>Late</th><th>Signature</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="box">Present <b>${presentCount}</b></div>
    <div class="box">Absent <b>${absentCount}</b></div>
    <div class="box">Late <b>${lateCount}</b></div>
  </div>
  <div class="foot">
    <div class="line">Instructor / Coordinator</div>
    <div class="line">Date &amp; Signature</div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error(t("allowPopups"));
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
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
        <h3 className="text-lg font-semibold">{t("selectACourse")}</h3>
        {courses.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              {t("noCoursesAssigned")}
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
          <p className="text-sm text-muted-foreground">{t("takeAttendance")}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label>{t("date")}</Label>
          <Input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-5">
          <Button onClick={handleSaveAttendance} disabled={saving || records.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t("saving") : t("saveAttendance")}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={records.length === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t("print")}
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
            {t("noStudentsEnrolledCourse")}
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
                  {t("present")}
                </Button>
                <Button
                  size="sm"
                  variant={record.status === "absent" ? "destructive" : "outline"}
                  onClick={() => updateStatus(record.studentId, "absent")}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  {t("absent")}
                </Button>
                <Button
                  size="sm"
                  variant={record.status === "late" ? "secondary" : "outline"}
                  onClick={() => updateStatus(record.studentId, "late")}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {t("late")}
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
  const { t } = useLanguage();
  return (
    <RoleGate allowedRoles={["admin", "instructor", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("takeAttendance")}
          description={t("recordAttendanceDesc")}
        />
        <AttendanceContent />
      </div>
    </RoleGate>
  );
}
