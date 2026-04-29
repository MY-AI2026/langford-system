"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { fetchCollection, runQuery } from "@/lib/firebase/rest-helpers";
import { InstallmentPlan, Student } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Coins,
  Download,
  RefreshCw,
  Wallet,
} from "lucide-react";
import Link from "next/link";

type DueRow = {
  studentId: string;
  studentName: string;
  studentPhone: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date | null;
  status: "overdue" | "due_soon" | "upcoming";
};

type StatusFilter = "all" | "overdue" | "due_soon" | "upcoming";

const STATUS_LABEL: Record<DueRow["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  upcoming: "Upcoming",
};

const STATUS_BADGE: Record<
  DueRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  overdue: "destructive",
  due_soon: "default",
  upcoming: "secondary",
};

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

function classifyDue(due: Date | null): DueRow["status"] {
  if (!due) return "upcoming";
  // Normalize to calendar day so an installment due today is not marked overdue
  // mid-day (dueDate is stored at 00:00 while `new Date()` carries the current time).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAhead = new Date(startOfToday);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  if (dueDay < startOfToday) return "overdue";
  if (dueDay <= sevenDaysAhead) return "due_soon";
  return "upcoming";
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function exportToCSV(rows: DueRow[]) {
  const headers = ["Student Name", "Phone", "Installment #", "Amount (KWD)", "Due Date", "Status"];
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.studentName,
        r.studentPhone,
        r.installmentNumber,
        r.amount.toFixed(3),
        r.dueDate ? r.dueDate.toISOString().slice(0, 10) : "",
        STATUS_LABEL[r.status],
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  const csv = "﻿" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outstanding_balances_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OutstandingBalancesReportPage() {
  return (
    <RoleGate allowedRoles={["admin", "accountant"]}>
      <OutstandingBalancesContent />
    </RoleGate>
  );
}

function OutstandingBalancesContent() {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const students = (await fetchCollection("students")) as Student[];

      const allRows: DueRow[] = [];
      const batchSize = 10;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (s) => {
            try {
              const plans = (await runQuery(
                {
                  from: [{ collectionId: "installmentPlans" }],
                },
                `students/${s.id}`
              )) as InstallmentPlan[];

              const studentRows: DueRow[] = [];
              for (const plan of plans) {
                for (const item of plan.installments || []) {
                  if (item.status === "paid") continue;
                  const due = toDate(item.dueDate);
                  studentRows.push({
                    studentId: s.id,
                    studentName: s.fullName,
                    studentPhone: s.phone,
                    installmentNumber: item.installmentNumber,
                    amount: item.amount,
                    dueDate: due,
                    status: classifyDue(due),
                  });
                }
              }
              return studentRows;
            } catch {
              return [] as DueRow[];
            }
          })
        );
        for (const r of results) allRows.push(...r);
      }

      // Sort: overdue first, then by due date ascending
      allRows.sort((a, b) => {
        const order = { overdue: 0, due_soon: 1, upcoming: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        const ta = a.dueDate?.getTime() ?? Infinity;
        const tb = b.dueDate?.getTime() ?? Infinity;
        return ta - tb;
      });

      setRows(allRows);
    } catch (err) {
      console.error("Failed to load outstanding balances:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (
        studentFilter &&
        !r.studentName.toLowerCase().includes(studentFilter.toLowerCase()) &&
        !r.studentPhone.includes(studentFilter)
      )
        return false;
      if (dueFrom) {
        const from = new Date(dueFrom + "T00:00:00");
        if (!r.dueDate || r.dueDate < from) return false;
      }
      if (dueTo) {
        const to = new Date(dueTo + "T23:59:59");
        if (!r.dueDate || r.dueDate > to) return false;
      }
      return true;
    });
  }, [rows, statusFilter, studentFilter, dueFrom, dueTo]);

  const summary = useMemo(() => {
    const overdueRows = filtered.filter((r) => r.status === "overdue");
    const dueSoonRows = filtered.filter((r) => r.status === "due_soon");
    const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);
    const overdueAmount = overdueRows.reduce((sum, r) => sum + r.amount, 0);
    const dueSoonAmount = dueSoonRows.reduce((sum, r) => sum + r.amount, 0);
    const studentsCount = new Set(filtered.map((r) => r.studentId)).size;
    return {
      totalCount: filtered.length,
      totalAmount,
      overdueCount: overdueRows.length,
      overdueAmount,
      dueSoonCount: dueSoonRows.length,
      dueSoonAmount,
      studentsCount,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding Balances"
        description="Students with unpaid installments — amount and due date"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={() => exportToCSV(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Total Outstanding
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalCount} installment(s) · {summary.studentsCount} student(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.overdueAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.overdueCount} installment(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Due in 7 Days
            </CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(summary.dueSoonAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.dueSoonCount} installment(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Students Affected
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.studentsCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due_soon">Due Soon (7 days)</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Student (name or phone)</Label>
            <Input
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              placeholder="Search student..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due From</Label>
            <Input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due To</Label>
            <Input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              min={dueFrom || undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Outstanding Installments ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Installment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={`${r.studentId}-${r.installmentNumber}-${idx}`}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/students/${r.studentId}`}
                          className="hover:underline"
                        >
                          {r.studentName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {r.studentPhone}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        #{r.installmentNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(r.amount)}
                      </TableCell>
                      <TableCell>
                        {r.dueDate ? formatDate(r.dueDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[r.status]}>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No outstanding installments
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
