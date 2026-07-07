"use client";

import { useEffect, useState } from "react";
import { ScheduleStudent, ScheduleEntryStudent } from "@/lib/types";
import { fetchStudentsForCourse } from "@/lib/services/schedule-service";
import { deleteEnrollment } from "@/lib/services/enrollment-service";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleStudentListProps {
  courseId: string | null;
  courseName?: string;
  /**
   * Roster attached directly to the entry (Academic Organizer classes). When
   * provided, it is rendered as-is (read-only) and no enrollment lookup runs.
   */
  directStudents?: ScheduleEntryStudent[];
}

export function ScheduleStudentList({
  courseId,
  courseName,
  directStudents,
}: ScheduleStudentListProps) {
  const { role, firebaseUser, userData } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<ScheduleStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const hasDirect = Array.isArray(directStudents);
  const canRemove = !hasDirect && (role === "admin" || role === "coordinator");

  useEffect(() => {
    if (hasDirect || !courseId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    fetchStudentsForCourse(courseId)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [courseId, hasDirect]);

  // Organizer-built class — render the attached snapshot roster directly.
  if (hasDirect) {
    const roster = directStudents ?? [];
    if (roster.length === 0) {
      return (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {t("noStudentsEnrolled")}
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          {roster.length} {roster.length !== 1 ? t("students") : t("student")}
        </div>
        <div className="space-y-1">
          {roster.map((s) => (
            <div
              key={s.studentId}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
            >
              <span className="text-sm">{s.studentName}</span>
              {s.level && (
                <Badge variant="outline" className="text-xs">
                  {s.level}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function handleRemove(s: ScheduleStudent) {
    if (!firebaseUser || !userData || !courseId) return;
    if (!confirm(`${t("removeStudentConfirm")} "${s.studentName}"?`)) return;
    setRemoving(s.studentId);
    try {
      await deleteEnrollment(
        s.studentId,
        s.enrollmentId,
        courseName || "course",
        firebaseUser.uid,
        userData.displayName
      );
      // Re-fetch from the server: a student with several active enrollments
      // in the same course should still appear after deleting just one of them.
      const fresh = await fetchStudentsForCourse(courseId);
      setStudents(fresh);
      toast.success(`${s.studentName} ${t("removed")}`);
    } catch {
      toast.error(t("failedToRemoveStudent"));
    } finally {
      setRemoving(null);
    }
  }

  if (!courseId) {
    return (
      <div className="py-3 text-center text-sm text-muted-foreground">
        {t("manualCourseNoStudents")}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {t("noStudentsEnrolled")}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        {students.length} {students.length !== 1 ? t("students") : t("student")}
      </div>
      <div className="space-y-1">
        {students.map((s) => (
          <div
            key={s.studentId}
            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
          >
            <span className="text-sm">{s.studentName}</span>
            <div className="flex items-center gap-2">
              {s.level && (
                <Badge variant="outline" className="text-xs">
                  {s.level}
                </Badge>
              )}
              {canRemove && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  disabled={removing === s.studentId}
                  onClick={() => handleRemove(s)}
                  title={t("removeFromCourse")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
