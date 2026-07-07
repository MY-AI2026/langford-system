"use client";

import { useEffect, useState } from "react";
import { DayOfWeek, DayPattern, ScheduleEntryStudent, User } from "@/lib/types";
import {
  getInstructors,
  createScheduleEntry,
  createSchedulePattern,
  checkTimeConflict,
} from "@/lib/services/schedule-service";
import {
  PATTERN_DAY_MAP,
  PATTERN_OPTIONS,
  ORG_WEEK_DAYS,
  DAY_LABELS_AR,
  TIME_SLOTS,
  formatTime12h,
} from "@/lib/organizer/constants";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface BuildScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: ScheduleEntryStudent[];
  defaultClassName: string;
  onSuccess: () => void;
}

export function BuildScheduleDialog({
  open,
  onOpenChange,
  students,
  defaultClassName,
  onSuccess,
}: BuildScheduleDialogProps) {
  const { firebaseUser } = useAuth();
  const [instructors, setInstructors] = useState<User[]>([]);
  const [instructorId, setInstructorId] = useState("");
  const [className, setClassName] = useState(defaultClassName);
  const [pattern, setPattern] = useState<DayPattern>("sat_mon_wed");
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClassName(defaultClassName);
      getInstructors().then(setInstructors).catch(() => setInstructors([]));
    }
  }, [open, defaultClassName]);

  function toggleDay(day: DayOfWeek) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    const instructor = instructors.find((i) => i.uid === instructorId);
    if (!instructor) {
      toast.error("اختار المدرّس الأول");
      return;
    }
    if (!className.trim()) {
      toast.error("اكتب اسم المجموعة");
      return;
    }
    if (startTime >= endTime) {
      toast.error("وقت البداية لازم يكون قبل وقت النهاية");
      return;
    }

    const targetDays: DayOfWeek[] =
      pattern === "custom" ? customDays : PATTERN_DAY_MAP[pattern];
    if (targetDays.length === 0) {
      toast.error("اختار يوم واحد على الأقل");
      return;
    }

    setSaving(true);
    try {
      // Conflict check per day (per-instructor) — mirrors the main scheduler.
      for (const day of targetDays) {
        const conflict = await checkTimeConflict(instructorId, day, startTime, endTime);
        if (conflict) {
          toast.error(
            `تعارض يوم ${DAY_LABELS_AR[day]} مع حصة "${conflict.courseName}"`
          );
          setSaving(false);
          return;
        }
      }

      const baseData = {
        instructorId,
        instructorName: instructor.displayName,
        courseId: null as string | null,
        courseName: className.trim(),
        startTime,
        endTime,
        room: room.trim(),
        notes: notes.trim(),
        isActive: true,
        createdBy: firebaseUser?.uid || "",
        students,
      };

      if (pattern === "custom") {
        const groupId =
          targetDays.length > 1
            ? `pg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
            : null;
        for (const day of targetDays) {
          await createScheduleEntry({
            ...baseData,
            dayOfWeek: day,
            dayPattern: "custom",
            patternGroupId: groupId,
          });
        }
      } else {
        const patternData = {
          ...baseData,
          dayPattern: pattern,
        };
        await createSchedulePattern(patternData, pattern as "sat_mon_wed" | "sun_tue_thu");
      }

      toast.success(`تم عمل الجدول لـ ${students.length} طالب ✅`);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("[build-schedule] save failed:", err);
      toast.error("حصل خطأ أثناء حفظ الجدول");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>بناء جدول للمجموعة</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {students.length} طالب هيتحطوا في الجدول ده
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>اسم المجموعة</Label>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="مثال: Elementary 1 — مجموعة أ"
            />
          </div>

          <div className="space-y-2">
            <Label>المدرّس</Label>
            <Select
              value={instructorId}
              onValueChange={(v) => setInstructorId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختار المدرّس" />
              </SelectTrigger>
              <SelectContent>
                {instructors.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    مفيش مدرسين متاحين
                  </div>
                ) : (
                  instructors.map((i) => (
                    <SelectItem key={i.uid} value={i.uid}>
                      {i.displayName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>الأيام</Label>
            <Select
              value={pattern}
              onValueChange={(v) => setPattern((v ?? "sat_mon_wed") as DayPattern)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {pattern === "custom" && (
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {ORG_WEEK_DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <Checkbox
                      checked={customDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    {DAY_LABELS_AR[day]}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>من</Label>
              <Select
                value={startTime}
                onValueChange={(v) => v && setStartTime(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTime12h(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>إلى</Label>
              <Select
                value={endTime}
                onValueChange={(v) => v && setEndTime(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTime12h(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>القاعة (اختياري)</Label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="مثال: قاعة 3"
            />
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            حفظ الجدول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
