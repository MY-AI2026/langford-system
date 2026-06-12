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

  // Commission: earned = enrolled students (the ones that actually pay out);
  // pending = still "new". Data is already snapshotted on each student.
  const commission = useMemo(() => {
    let earned = 0;
    let pending = 0;
    for (const s of students) {
      if (s.status === "enrolled") earned += s.commissionAmount || 0;
      else if (s.status === "new") pending += s.commissionAmount || 0;
    }
    return {
      earned,
      pending,
      currency: students[0]?.currency || "KWD",
    };
  }, [students]);

  const fmtMoney = (n: number) =>
    `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${commission.currency}`;

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ListChecks className="h-6 w-6 text-primary" />
            My Students
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students you have registered. You cannot see other agents&apos; students.
          </p>
        </div>

        <Button onClick={() => router.push(REG_ROUTES.registerStudent)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Register a New Student
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={total} tone="primary" />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.new.en}
          value={stats.new}
          tone="blue"
        />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.enrolled.en}
          value={stats.enrolled}
          tone="green"
        />
        <StatCard
          label={REG_STUDENT_STATUS_LABELS.cancelled.en}
          value={stats.cancelled}
          tone="red"
        />
      </div>

      {/* Commission earned — the agent's headline number */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-xs text-green-700 dark:text-green-300">
            Commission earned (enrolled)
          </p>
          <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
            {fmtMoney(commission.earned)}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Pending (still new)
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {fmtMoney(commission.pending)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search"
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
            <SelectItem value="all">All statuses</SelectItem>
            {REG_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {REG_STUDENT_STATUS_LABELS[s].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : students.length === 0 ? (
        <EmptyState onAdd={() => router.push(REG_ROUTES.registerStudent)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.fullName}
                    {s.email && (
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.courseName}
                    <p className="text-xs text-muted-foreground">
                      {s.courseFee > 0
                        ? `${s.courseFee.toLocaleString("en-US")} ${s.currency}`
                        : "—"}
                    </p>
                  </TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`border-0 ${REG_STUDENT_STATUS_LABELS[s.status].color}`}
                    >
                      {REG_STUDENT_STATUS_LABELS[s.status].en}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={
                      s.status === "enrolled"
                        ? "font-medium text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    {s.commissionAmount > 0
                      ? `${s.commissionAmount.toLocaleString("en-US")} ${s.currency}`
                      : "—"}
                  </TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

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
        <h3 className="text-base font-semibold">No students yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Register your first student and it will appear here right away.
        </p>
        <Button className="mt-4" onClick={onAdd}>
          <UserPlus className="mr-2 h-4 w-4" />
          Register a New Student
        </Button>
      </CardContent>
    </Card>
  );
}

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
