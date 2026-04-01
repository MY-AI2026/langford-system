"use client";

import { Student, StudentStatus } from "@/lib/types";
import { STUDENT_STATUS_CONFIG, PIPELINE_STATUSES } from "@/lib/utils/constants";
import { PipelineCard } from "./pipeline-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineBoardProps {
  students: Student[];
  onStatusChange: (studentId: string, newStatus: StudentStatus) => void;
}

export function PipelineBoard({ students, onStatusChange }: PipelineBoardProps) {
  const columns = PIPELINE_STATUSES.map((status) => ({
    status,
    config: STUDENT_STATUS_CONFIG[status],
    students: students.filter((s) => s.status === status),
  }));

  function handleDragStart(e: React.DragEvent, studentId: string) {
    e.dataTransfer.setData("studentId", studentId);
  }

  function handleDrop(e: React.DragEvent, status: StudentStatus) {
    e.preventDefault();
    const studentId = e.dataTransfer.getData("studentId");
    if (studentId) {
      onStatusChange(studentId, status);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ status, config, students: columnStudents }) => (
        <div
          key={status}
          className="min-w-64 flex-1"
          onDrop={(e) => handleDrop(e, status)}
          onDragOver={handleDragOver}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "lead" && "bg-gray-400",
                  status === "contacted" && "bg-blue-400",
                  status === "evaluated" && "bg-yellow-400",
                  status === "enrolled" && "bg-green-400",
                  status === "paid" && "bg-emerald-500"
                )}
              />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {columnStudents.length}
            </Badge>
          </div>
          <div className="space-y-2 rounded-lg bg-muted/30 p-2 min-h-32">
            {columnStudents.map((student) => (
              <div
                key={student.id}
                draggable
                onDragStart={(e) => handleDragStart(e, student.id)}
                className="cursor-grab active:cursor-grabbing"
              >
                <PipelineCard student={student} />
              </div>
            ))}
            {columnStudents.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No students
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
