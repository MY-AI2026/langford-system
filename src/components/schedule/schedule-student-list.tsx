"use client";

import { useEffect, useState } from "react";
import { ScheduleStudent } from "@/lib/types";
import { fetchStudentsForCourse } from "@/lib/services/schedule-service";
import { deleteEnrollment } from "@/lib/services/enrollment-service";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleStudentListProps {
  courseId: string | null;
  courseName?: string;
}

export function ScheduleStudentList({ courseId, courseName }: ScheduleStudentListProps) {
  const { role, firebaseUser, userData } = useAuth();
  const [students, setStudents] = useState<ScheduleStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const canRemove = role === "admin" || role === "coordinator";

  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    fetchStudentsForCourse(courseId)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [courseId]);

  async function handleRemove(s: ScheduleStudent) {
    if (!firebaseUser || !userData) return;
    if (!confirm(`Remove "${s.studentName}" from ${courseName || "this course"}?`)) return;
    setRemoving(s.studentId);
    try {
      await deleteEnrollment(
        s.studentId,
        s.enrollmentId,
        courseName || "course",
        firebaseUser.uid,
        userData.displayName
      );
      setStudents((prev) => prev.filter((x) => x.studentId !== s.studentId));
      toast.success(`${s.studentName} removed`);
    } catch {
      toast.error("Failed to remove student");
    } finally {
      setRemoving(null);
    }
  }

  if (!courseId) {
    return (
      <div className="py-3 text-center text-sm text-muted-foreground">
        Manual course — no enrolled students
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
        No students enrolled
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        {students.length} student{students.length !== 1 ? "s" : ""}
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
                  title="Remove from course"
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
