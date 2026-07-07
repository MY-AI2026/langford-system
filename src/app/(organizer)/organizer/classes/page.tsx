"use client";

import { useEffect, useMemo, useState } from "react";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { ScheduleEntry, DayOfWeek } from "@/lib/types";
import {
  subscribeToAllSchedules,
  deleteScheduleEntry,
  deleteSchedulePattern,
} from "@/lib/services/schedule-service";
import { formatDays, formatTime12h } from "@/lib/organizer/constants";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import {
  ScheduleShareButton,
  ShareClassData,
} from "@/components/organizer/schedule-share-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  User as UserIcon,
  Clock,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface ClassGroup {
  key: string;
  patternGroupId: string | null;
  entryIds: string[];
  rep: ScheduleEntry;
  days: DayOfWeek[];
}

/** Group organizer-built entries into classes (siblings share a patternGroupId). */
function groupEntries(entries: ScheduleEntry[]): ClassGroup[] {
  const map = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    const key = e.patternGroupId || e.id;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return [...map.entries()].map(([key, list]) => {
    const rep = list[0];
    return {
      key,
      patternGroupId: rep.patternGroupId,
      entryIds: list.map((e) => e.id),
      rep,
      days: list.map((e) => e.dayOfWeek).sort((a, b) => a - b),
    };
  });
}

function ClassesScreen() {
  const { settings } = useSystemSettings();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ClassGroup | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllSchedules((data) => {
      // Only organizer-built classes carry a direct `students` roster.
      setEntries(data.filter((e) => Array.isArray(e.students)));
      setLoading(false);
    });
    return () => unsub();
  }, [refreshKey]);

  const classes = useMemo(() => groupEntries(entries), [entries]);
  const instituteName = settings.instituteNameAr || settings.instituteName;

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.patternGroupId) {
        await deleteSchedulePattern(deleteTarget.patternGroupId);
      } else {
        await deleteScheduleEntry(deleteTarget.rep.id);
      }
      toast.success("تم حذف الحصة");
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("تعذّر الحذف");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الجداول والحصص"
        description="الحصص اللي عملتها. ابعت لكل طالب صورة جدوله على الواتساب برسالة جاهزة."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              لسه مفيش حصص. روح لشاشة «الطلبة المدفوعين» واعمل أول جدول.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {classes.map((c) => {
            const rep = c.rep;
            const daysLabel = formatDays(c.days);
            const timeLabel = `${formatTime12h(rep.startTime)} - ${formatTime12h(
              rep.endTime
            )}`;
            const classData: ShareClassData = {
              instituteName,
              className: rep.courseName,
              instructorName: rep.instructorName,
              daysLabel,
              timeLabel,
              room: rep.room,
            };
            const students = rep.students ?? [];
            return (
              <Card key={c.key}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{rep.courseName}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                      title="حذف الحصة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      {rep.instructorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {daysLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {timeLabel}
                    </span>
                    {rep.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {rep.room}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Badge variant="secondary">{students.length}</Badge>
                    طالب
                  </div>
                  {students.map((s) => (
                    <div
                      key={s.studentId}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{s.studentName}</span>
                        {s.level && (
                          <Badge variant="outline" className="text-xs">
                            {s.level}
                          </Badge>
                        )}
                      </div>
                      <ScheduleShareButton student={s} classData={classData} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف الحصة</DialogTitle>
            <DialogDescription>
              هيتحذف كل أيام الحصة دي من جدول المدرّس. الإجراء ده لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizerClassesPage() {
  return (
    <RoleGate allowedRoles={["academic_organizer"]}>
      <ClassesScreen />
    </RoleGate>
  );
}
