"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { Student, ScheduleEntryStudent } from "@/lib/types";
import { subscribeToStudents } from "@/lib/services/student-service";
import { levelOrderIndex } from "@/lib/organizer/constants";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { BuildScheduleDialog } from "@/components/organizer/build-schedule-dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarPlus, Search, Wallet } from "lucide-react";

const UNASSIGNED = "__unassigned__";

interface LevelGroup {
  level: string; // real level or UNASSIGNED
  label: string;
  students: Student[];
}

function toSnapshot(s: Student): ScheduleEntryStudent {
  return {
    studentId: s.id,
    studentName: s.fullName,
    level: s.evaluation?.finalLevel ?? null,
    phone: s.phone,
  };
}

function PaidStudentsScreen() {
  const { role, firebaseUser } = useAuth();
  const { settings } = useSystemSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullPaidOnly, setFullPaidOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, Student>>({});
  const [buildOpen, setBuildOpen] = useState(false);

  useEffect(() => {
    if (!role || !firebaseUser) return;
    setLoading(true);
    const unsub = subscribeToStudents(
      { role, userId: firebaseUser.uid },
      (data) => {
        setStudents(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [role, firebaseUser]);

  // Paid + search filter, then group by placement-test level.
  const groups = useMemo<LevelGroup[]>(() => {
    const q = search.trim().toLowerCase();
    const paid = students.filter((s) => {
      if (s.isArchived) return false;
      const ps = s.paymentSummary;
      const hasPaid = fullPaidOnly
        ? ps?.paymentStatus === "paid"
        : (ps?.amountPaid ?? 0) > 0;
      if (!hasPaid) return false;
      if (q) {
        return (
          s.fullName?.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const byLevel = new Map<string, Student[]>();
    for (const s of paid) {
      const key = s.evaluation?.finalLevel || UNASSIGNED;
      const arr = byLevel.get(key) ?? [];
      arr.push(s);
      byLevel.set(key, arr);
    }

    return [...byLevel.entries()]
      .map(([level, list]) => ({
        level,
        label: level === UNASSIGNED ? "غير محدّد المستوى" : level,
        students: list.sort((a, b) => a.fullName.localeCompare(b.fullName, "ar")),
      }))
      .sort(
        (a, b) =>
          levelOrderIndex(a.level === UNASSIGNED ? null : a.level, settings.levels) -
          levelOrderIndex(b.level === UNASSIGNED ? null : b.level, settings.levels)
      );
  }, [students, fullPaidOnly, search, settings.levels]);

  const selectedList = Object.values(selected);
  const selectedCount = selectedList.length;

  function toggleStudent(s: Student) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[s.id]) delete next[s.id];
      else next[s.id] = s;
      return next;
    });
  }

  function toggleGroup(group: LevelGroup) {
    const allSelected = group.students.every((s) => selected[s.id]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const s of group.students) {
        if (allSelected) delete next[s.id];
        else next[s.id] = s;
      }
      return next;
    });
  }

  // Default class name = the shared level when the whole selection is one level.
  const defaultClassName = useMemo(() => {
    const levels = new Set(
      selectedList.map((s) => s.evaluation?.finalLevel || "")
    );
    if (levels.size === 1) {
      const only = [...levels][0];
      return only ? `${only} — مجموعة` : "مجموعة جديدة";
    }
    return "مجموعة جديدة";
  }, [selectedList]);

  const totalPaidCount = groups.reduce((n, g) => n + g.students.length, 0);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="الطلبة المدفوعين"
        description="الطلبة اللي دفعوا فلوس، مفرزين حسب مستوى اختبار تحديد المستوى. اختار مجموعة واعملهم جدول."
      />

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو التليفون…"
            className="pe-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={fullPaidOnly} onCheckedChange={setFullPaidOnly} />
          <span>اللي خلّصوا دفع بالكامل بس</span>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : totalPaidCount === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              مفيش طلبة مطابقين للفلتر الحالي
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const allSelected = group.students.every((s) => selected[s.id]);
            return (
              <Card key={group.level}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="secondary">{group.students.length}</Badge>
                    {group.label}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroup(group)}
                  >
                    {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {group.students.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!selected[s.id]}
                          onCheckedChange={() => toggleStudent(s)}
                        />
                        <div>
                          <div className="text-sm font-medium">{s.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-end text-xs text-muted-foreground">
                        دفع {s.paymentSummary?.amountPaid ?? 0} د.ك
                        {(s.paymentSummary?.remainingBalance ?? 0) > 0 && (
                          <span className="text-amber-600">
                            {" "}
                            · باقي {s.paymentSummary?.remainingBalance}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>المحددين: {selectedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
                مسح التحديد
              </Button>
              <Button onClick={() => setBuildOpen(true)}>
                <CalendarPlus className="ms-1.5 h-4 w-4" />
                ابنِ جدول
              </Button>
            </div>
          </div>
        </div>
      )}

      <BuildScheduleDialog
        open={buildOpen}
        onOpenChange={setBuildOpen}
        students={selectedList.map(toSnapshot)}
        defaultClassName={defaultClassName}
        onSuccess={() => setSelected({})}
      />
    </div>
  );
}

export default function OrganizerStudentsPage() {
  return (
    <RoleGate allowedRoles={["academic_organizer"]}>
      <PaidStudentsScreen />
    </RoleGate>
  );
}
