"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToCourses } from "@/lib/services/course-service";
import { createEnrollment } from "@/lib/services/enrollment-service";
import { Course, CourseCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
}

function tsToDateInput(value: unknown): string {
  if (!value) return "";
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString().split("T")[0];
  }
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return "";
}

export function EnrollDialog({ open, onOpenChange, studentId }: EnrollDialogProps) {
  const { firebaseUser, userData } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [fees, setFees] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCourses((data) => {
      setCourses(data.filter((c) => c.isActive));
    });
    return () => unsub();
  }, []);

  // Auto-fill fees and course dates when course changes
  useEffect(() => {
    if (!courseId) return;
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    if (course.defaultFees) {
      setFees(course.defaultFees);
    }
    const courseStart = tsToDateInput(course.startDate);
    const courseEnd = tsToDateInput(course.endDate);
    if (courseStart) setStartDate(courseStart);
    if (courseEnd) setEndDate(courseEnd);
    else setEndDate("");
  }, [courseId, courses]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCourseId("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setFees(0);
      setNotes("");
    }
  }, [open]);

  const selectedCourse = courses.find((c) => c.id === courseId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!courseId) {
      toast.error("Please select a course");
      return;
    }
    if (!firebaseUser || !userData) {
      toast.error("Not authenticated");
      return;
    }

    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      toast.error("Course not found");
      return;
    }

    if (endDate && endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setSaving(true);
    try {
      await createEnrollment(
        studentId,
        {
          courseId: course.id,
          courseName: course.name,
          courseCategory: (course.category || "other") as CourseCategory,
          level: course.level || undefined,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          fees,
          instructorId: course.instructorId,
          instructorName: course.instructorName,
          notes,
        },
        firebaseUser.uid,
        userData.displayName
      );
      toast.success(`Enrolled in ${course.name}`);
      onOpenChange(false);
    } catch (error) {
      console.error("[EnrollDialog] Failed:", error);
      toast.error("Failed to enroll student");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Course *</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">— Select a course —</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                  {course.defaultFees ? ` (${course.defaultFees} KWD)` : ""}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground">
                Category: {selectedCourse.category || "—"} | Level: {selectedCourse.level || "—"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
          {selectedCourse?.startDate || selectedCourse?.endDate ? (
            <p className="text-xs text-muted-foreground -mt-1">
              Auto-filled from course dates. Adjust if needed.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Fees (KWD)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              value={fees}
              onChange={(e) => setFees(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !courseId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
