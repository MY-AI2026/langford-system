"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Trash2, ClipboardCheck, MapPin } from "lucide-react";
import { ScheduleStudentList } from "./schedule-student-list";

// Color palette for schedule entries
const ENTRY_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-100",
  "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100",
  "bg-violet-50 border-violet-200 text-violet-900 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-100",
  "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100",
  "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-100",
  "bg-cyan-50 border-cyan-200 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-100",
  "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-100",
  "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-100",
];

function getEntryColor(courseId: string | null, courseName: string): string {
  const key = courseId || courseName;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ENTRY_COLORS[Math.abs(hash) % ENTRY_COLORS.length];
}

interface ScheduleEntryCardProps {
  entry: ScheduleEntry;
  editable?: boolean;
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entry: ScheduleEntry) => void;
}

export function ScheduleEntryCard({
  entry,
  editable = false,
  onEdit,
  onDelete,
}: ScheduleEntryCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const colorClass = getEntryColor(entry.courseId, entry.courseName);

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`group w-full cursor-pointer rounded-lg border p-2 text-left transition-all hover:shadow-md ${colorClass}`}
        style={{ height: "100%" }}
      >
        <div className="flex h-full flex-col justify-between gap-1">
          <div>
            <p className="text-sm font-semibold leading-tight truncate">
              {entry.courseName}
            </p>
            <p className="text-xs opacity-80">
              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
            </p>
          </div>
          {entry.room && (
            <div className="flex items-center gap-1 text-xs opacity-70">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{entry.room}</span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold">{entry.courseName}</h4>
            <p className="text-sm text-muted-foreground">
              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
            </p>
            {entry.room && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {entry.room}
              </div>
            )}
            {entry.notes && (
              <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
            )}
          </div>

          <div className="border-t pt-3">
            <ScheduleStudentList courseId={entry.courseId} />
          </div>

          <div className="flex gap-2 border-t pt-3">
            {entry.courseId && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setOpen(false);
                  router.push(`/attendance?courseId=${entry.courseId}`);
                }}
              >
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                Take Attendance
              </Button>
            )}
            {editable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    onEdit?.(entry);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setOpen(false);
                    onDelete?.(entry);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
