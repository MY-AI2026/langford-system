"use client";

import { useEffect, useState } from "react";
import { ScheduleStudent } from "@/lib/types";
import { fetchStudentsForCourse } from "@/lib/services/schedule-service";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface ScheduleStudentListProps {
  courseId: string | null;
}

export function ScheduleStudentList({ courseId }: ScheduleStudentListProps) {
  const [students, setStudents] = useState<ScheduleStudent[]>([]);
  const [loading, setLoading] = useState(false);

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
