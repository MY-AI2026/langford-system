"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { subscribeToMyStudents } from "@/lib/services/reg-student-service";
import { RegStudent, RegStudentStatus } from "@/lib/types";
import {
  REG_STUDENT_STATUS_LABELS,
  REG_STATUS_ORDER,
  REG_ROUTES,
} from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, Search, UserPlus, Inbox } from "lucide-react";

function MyStudentsContent() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [students, setStudents] = useState<RegStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegStudentStatus | "all">("all");

  useEffect(() => {
    if (!firebaseUser) return;
    setLoading(true);
    const unsub = subscribeToMyStudents(
      firebaseUser.uid,
      { status: statusFilter, searchQuery: search },
      (data) => {
        setStudents(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser, statusFilter, search]);

  const total = students.length;
  const stats = useMemo(() => {
    const out: Record<RegStudentStatus, number> = {
      new: 0,
      enrolled: 0,
      cancelled: 0,
    };
    for (const s of students) out[s.status]++;
    return out;
  }, [students]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ListChecks className="h-6 w-6 text-primary" />
            طلبتي
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الطلبة اللي إنت سجّلتهم. مش هتشوف طلبة الموظفين التانيين.
          </p>
        </div>

        <Button onClick={() => router.push(REG_ROUTES.registerStudent)}>
          <UserPlus className="ml-2 h-4 w-4" />
          سجّل طالب جديد
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="الإجمالي" value={total} tone="primary" />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.new.ar}
          value={stats.new}
          tone="blue"
        />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.enrolled.ar}
          value={stats.enrolled}
          tone="green"
        />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.cancelled.ar}
          value={stats.cancelled}
          tone="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو التليفون أو الإيميل"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
            aria-label="بحث"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as RegStudentStatus | "all")
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {REG_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {REG_STUDENT_STATUS_LABELS[s].ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : students.length === 0 ? (
        <EmptyState onAdd={() => router.push(REG_ROUTES.registerStudent)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>الكورس</TableHead>
                <TableHead>التليفون</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.fullName}
                    {s.email && (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {s.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.courseName}
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {s.courseFee > 0
                        ? `${s.courseFee.toLocaleString("en-US")} ${s.currency}`
                        : "—"}
                    </p>
                  </TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {s.phone}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`border-0 ${REG_STUDENT_STATUS_LABELS[s.status].color}`}
                    >
                      {REG_STUDENT_STATUS_LABELS[s.status].ar}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {formatDate(s.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "blue" | "green" | "red";
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
    green: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
    red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <Card className={`border ${toneClasses[tone]}`}>
      <CardContent className="p-4">
        <p className="text-xs">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-base font-semibold">لسه مفيش طلبة</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          سجّل أول طالب وهيظهر هنا على طول.
        </p>
        <Button className="mt-4" onClick={onAdd}>
          <UserPlus className="ml-2 h-4 w-4" />
          سجّل طالب جديد
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: unknown): string {
  if (!value) return "—";
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    date = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === "string") {
    date = new Date(value);
  } else {
    return "—";
  }
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MyStudentsPage() {
  return (
    <RoleGate allowedRoles={["admin", "acceptix_agent"]}>
      <MyStudentsContent />
    </RoleGate>
  );
}
