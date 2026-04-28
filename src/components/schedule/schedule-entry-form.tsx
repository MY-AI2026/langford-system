"use client";

import { useEffect, useState } from "react";
import { Course, ScheduleEntry, DayOfWeek, DayPattern } from "@/lib/types";
import { subscribeToCourses } from "@/lib/services/course-service";
import {
  createScheduleEntry,
  createSchedulePattern,
  updateScheduleEntry,
  checkTimeConflict,
} from "@/lib/services/schedule-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/format";

const DAY_NAMES: { value: DayOfWeek; label: string; labelAr: string }[] = [
  { value: 6, label: "Saturday", labelAr: "السبت" },
  { value: 0, label: "Sunday", labelAr: "الأحد" },
  { value: 1, label: "Monday", labelAr: "الاثنين" },
  { value: 2, label: "Tuesday", labelAr: "الثلاثاء" },
  { value: 3, label: "Wednesday", labelAr: "الأربعاء" },
  { value: 4, label: "Thursday", labelAr: "الخميس" },
];

const TIME_SLOTS: string[] = [];
for (let h = 10; h <= 20; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const newH = Math.min(h + hours, 22);
  return `${newH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface ScheduleEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  instructorName: string;
  editEntry?: ScheduleEntry | null;
  createdBy: string;
  onSuccess: () => void;
}

export function ScheduleEntryForm({
  open,
  onOpenChange,
  instructorId,
  instructorName,
  editEntry,
  createdBy,
  onSuccess,
}: ScheduleEntryFormProps) {
  const isEdit = !!editEntry;

  // Form state
  const [courseSource, setCourseSource] = useState<"existing" | "manual">("existing");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const [dayPattern, setDayPattern] = useState<DayPattern>("sat_mon_wed");
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Courses list
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const unsub = subscribeToCourses((data) => {
      setCourses(data.filter((c) => c.isActive));
    });
    return () => unsub();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (editEntry) {
      setCourseSource(editEntry.courseId ? "existing" : "manual");
      setCourseId(editEntry.courseId);
      setCourseName(editEntry.courseName);
      setDayPattern("custom"); // editing a single entry
      setCustomDays([editEntry.dayOfWeek]);
      setStartTime(editEntry.startTime);
      setEndTime(editEntry.endTime);
      setRoom(editEntry.room || "");
      setNotes(editEntry.notes || "");
    } else {
      resetForm();
    }
  }, [editEntry, open]);

  // Auto-calculate end time
  useEffect(() => {
    if (!isEdit) {
      setEndTime(addHours(startTime, 2));
    }
  }, [startTime, isEdit]);

  function resetForm() {
    setCourseSource("existing");
    setCourseId(null);
    setCourseName("");
    setDayPattern("sat_mon_wed");
    setCustomDays([]);
    setStartTime("10:00");
    setEndTime("12:00");
    setRoom("");
    setNotes("");
  }

  function toggleDay(day: DayOfWeek) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit() {
    // Validation
    const finalCourseName = courseSource === "existing"
      ? courses.find((c) => c.id === courseId)?.name || ""
      : courseName.trim();

    if (!finalCourseName) {
      toast.error("Please select or enter a course name");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (endTime > "22:00") {
      toast.error("End time cannot exceed 10:00 PM");
      return;
    }

    setSaving(true);

    try {
      if (isEdit && editEntry) {
        // Check time conflict (excluding current entry)
        const conflict = await checkTimeConflict(
          instructorId,
          editEntry.dayOfWeek,
          startTime,
          endTime,
          editEntry.id
        );
        if (conflict) {
          toast.error(`Time conflict with "${conflict.courseName}" on this day`);
          setSaving(false);
          return;
        }

        await updateScheduleEntry(editEntry.id, {
          courseId: courseSource === "existing" ? courseId : null,
          courseName: finalCourseName,
          startTime,
          endTime,
          room,
          notes,
        });
        toast.success("Schedule entry updated");
      } else {
        // Create new entries
        const baseData = {
          instructorId,
          instructorName,
          courseId: courseSource === "existing" ? courseId : null,
          courseName: finalCourseName,
          startTime,
          endTime,
          room,
          notes,
          isActive: true,
          createdBy,
        };

        if (dayPattern === "custom") {
          if (customDays.length === 0) {
            toast.error("Please select at least one day");
            setSaving(false);
            return;
          }

          // Check conflicts for each custom day
          for (const day of customDays) {
            const conflict = await checkTimeConflict(instructorId, day, startTime, endTime);
            if (conflict) {
              const dayName = DAY_NAMES.find((d) => d.value === day)?.label || "";
              toast.error(`Time conflict on ${dayName} with "${conflict.courseName}"`);
              setSaving(false);
              return;
            }
          }

          const groupId = customDays.length > 1
            ? `pg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
            : null;

          for (const day of customDays) {
            await createScheduleEntry({
              ...baseData,
              dayOfWeek: day,
              dayPattern: "custom",
              patternGroupId: groupId,
            });
          }
          toast.success(`${customDays.length} schedule entries created`);
        } else {
          // Pattern-based creation (Sat-Mon-Wed or Sun-Tue-Thu)
          const patternDays = dayPattern === "sat_mon_wed" ? [6, 1, 3] : [0, 2, 4];
          for (const day of patternDays) {
            const conflict = await checkTimeConflict(instructorId, day as DayOfWeek, startTime, endTime);
            if (conflict) {
              const dayName = DAY_NAMES.find((d) => d.value === day)?.label || "";
              toast.error(`Time conflict on ${dayName} with "${conflict.courseName}"`);
              setSaving(false);
              return;
            }
          }

          const { dayOfWeek: _unused, patternGroupId: _unused2, ...patternData } = {
            ...baseData,
            dayOfWeek: 0 as DayOfWeek,
            dayPattern,
            patternGroupId: null as string | null,
          };
          await createSchedulePattern(
            patternData,
            dayPattern as "sat_mon_wed" | "sun_tue_thu"
          );
          toast.success("3 schedule entries created");
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Failed to save schedule:", err);
      toast.error("Failed to save schedule entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Schedule Entry" : "Add Schedule Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Instructor display */}
          <div>
            <Label className="text-muted-foreground text-xs">Instructor</Label>
            <p className="font-medium">{instructorName}</p>
          </div>

          {/* Course Source */}
          <div className="space-y-2">
            <Label>Course</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={courseSource === "existing" ? "default" : "outline"}
                onClick={() => setCourseSource("existing")}
              >
                From Courses
              </Button>
              <Button
                type="button"
                size="sm"
                variant={courseSource === "manual" ? "default" : "outline"}
                onClick={() => setCourseSource("manual")}
              >
                Manual Entry
              </Button>
            </div>

            {courseSource === "existing" ? (
              <Select
                value={courseId || ""}
                onValueChange={(val) => setCourseId(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.level ? `(${c.level})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Enter course name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            )}
            {courseSource === "existing" && courseId && (() => {
              const c = courses.find((x) => x.id === courseId);
              if (!c || (!c.startDate && !c.endDate)) return null;
              return (
                <p className="text-xs text-muted-foreground">
                  Course period: {c.startDate ? formatDate(c.startDate) : "—"}
                  {" → "}
                  {c.endDate ? formatDate(c.endDate) : "—"}
                </p>
              );
            })()}
          </div>

          {/* Day Pattern (only for new entries) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>Day Pattern</Label>
              <Select
                value={dayPattern}
                onValueChange={(val) => setDayPattern(val as DayPattern)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sat_mon_wed">
                    Sat - Mon - Wed (سبت - اثنين - اربعاء)
                  </SelectItem>
                  <SelectItem value="sun_tue_thu">
                    Sun - Tue - Thu (أحد - ثلاثاء - خميس)
                  </SelectItem>
                  <SelectItem value="custom">Custom Days</SelectItem>
                </SelectContent>
              </Select>

              {dayPattern === "custom" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {DAY_NAMES.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={customDays.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={(val) => val && setStartTime(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTimeDisplay(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={(val) => val && setEndTime(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter((t) => t > startTime).map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTimeDisplay(t)}
                    </SelectItem>
                  ))}
                  <SelectItem value="22:00">10:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Input
              placeholder="e.g., Room 101"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update" : "Add to Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m} ${ampm}`;
}
