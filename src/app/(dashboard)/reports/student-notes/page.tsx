"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { fetchCollection, runQuery } from "@/lib/firebase/rest-helpers";
import { ActivityLogEntry, ActivityLogType, Student } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";
import { Timestamp } from "firebase/firestore";
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
import { Download, FileText, MessageSquare, RefreshCw } from "lucide-react";

type NoteRow = ActivityLogEntry & {
  studentId: string;
  studentName: string;
  studentPhone: string;
};

const TYPE_LABELS: Record<ActivityLogType, string> = {
  note: "Note",
  follow_up: "Follow-up",
  status_change: "Status Change",
  payment: "Payment",
  evaluation: "Evaluation",
  edit: "Edit",
};

const TYPE_VARIANTS: Record<
  ActivityLogType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  note: "secondary",
  follow_up: "default",
  status_change: "outline",
  payment: "default",
  evaluation: "outline",
  edit: "secondary",
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

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function exportToCSV(rows: NoteRow[]) {
  const headers = [
    "Student Name",
    "Phone",
    "Type",
    "Description",
    "Created By",
    "Created At",
    "Follow-up Date",
    "Follow-up Done",
  ];
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    const createdAt = toDate(r.createdAt);
    const followUp = toDate(r.followUpDate);
    lines.push(
      [
        r.studentName,
        r.studentPhone,
        TYPE_LABELS[r.type] ?? r.type,
        r.description,
        r.createdByName,
        createdAt ? createdAt.toISOString() : "",
        followUp ? followUp.toISOString() : "",
        r.isFollowUpDone ? "Yes" : "No",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `student_notes_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StudentNotesReportPage() {
  return (
    <RoleGate allowedRoles={["admin", "accountant"]}>
      <StudentNotesContent />
    </RoleGate>
  );
}

function StudentNotesContent() {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ActivityLogType | "all">("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      // 1. Fetch all students (just id, fullName, phone)
      const students = (await fetchCollection("students")) as Student[];

      // 2. For each student, fetch their activityLog in parallel
      const allRows: NoteRow[] = [];
      const batchSize = 10;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (s) => {
            try {
              const entries = (await runQuery(
                {
                  from: [{ collectionId: "activityLog" }],
                  orderBy: [
                    {
                      field: { fieldPath: "createdAt" },
                      direction: "DESCENDING",
                    },
                  ],
                },
                `students/${s.id}`
              )) as ActivityLogEntry[];
              return entries.map<NoteRow>((e) => ({
                ...e,
                studentId: s.id,
                studentName: s.fullName,
                studentPhone: s.phone,
              }));
            } catch {
              return [] as NoteRow[];
            }
          })
        );
        for (const r of results) allRows.push(...r);
      }

      // Sort by createdAt descending
      allRows.sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() ?? 0;
        const db = toDate(b.createdAt)?.getTime() ?? 0;
        return db - da;
      });

      setRows(allRows);
    } catch (err) {
      console.error("Failed to load student notes:", err);
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
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (
        studentFilter &&
        !r.studentName.toLowerCase().includes(studentFilter.toLowerCase()) &&
        !r.studentPhone.includes(studentFilter)
      )
        return false;
      if (
        createdByFilter &&
        !(r.createdByName ?? "")
          .toLowerCase()
          .includes(createdByFilter.toLowerCase())
      )
        return false;
      const d = toDate(r.createdAt);
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (!d || d < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        if (!d || d > to) return false;
      }
      return true;
    });
  }, [rows, typeFilter, studentFilter, createdByFilter, dateFrom, dateTo]);

  // Classification counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: filtered.length,
      note: 0,
      follow_up: 0,
      status_change: 0,
      payment: 0,
      evaluation: 0,
      edit: 0,
    };
    for (const r of filtered) {
      c[r.type] = (c[r.type] ?? 0) + 1;
    }
    return c;
  }, [filtered]);

  // Group by student for classified view
  const groupedByStudent = useMemo(() => {
    const map = new Map<
      string,
      { studentId: string; studentName: string; studentPhone: string; entries: NoteRow[] }
    >();
    for (const r of filtered) {
      if (!map.has(r.studentId)) {
        map.set(r.studentId, {
          studentId: r.studentId,
          studentName: r.studentName,
          studentPhone: r.studentPhone,
          entries: [],
        });
      }
      map.get(r.studentId)!.entries.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName)
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Notes Report"
        description="All notes and activities logged on students"
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

      {/* Summary cards — classification */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {(["all", "note", "follow_up", "status_change", "payment", "evaluation", "edit"] as const).map(
          (k) => (
            <Card key={k}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs text-muted-foreground capitalize">
                  {k === "all" ? "Total" : TYPE_LABELS[k as ActivityLogType]}
                </CardTitle>
                {k === "all" ? (
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{counts[k] ?? 0}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as ActivityLogType | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="evaluation">Evaluation</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
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
            <Label className="text-xs">Created By</Label>
            <Input
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
              placeholder="Sales rep name..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Notes ({filtered.length})
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
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const followUp = toDate(r.followUpDate);
                    return (
                      <TableRow key={`${r.studentId}-${r.id}`}>
                        <TableCell className="font-medium">
                          <div>{r.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.studentPhone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TYPE_VARIANTS[r.type] ?? "secondary"}>
                            {TYPE_LABELS[r.type] ?? r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md whitespace-pre-wrap text-sm">
                          {r.description}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.createdByName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(r.createdAt as unknown as Timestamp)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {followUp ? (
                            <div className="flex flex-col">
                              <span>{formatDateTime(r.followUpDate as unknown as Timestamp)}</span>
                              <Badge
                                variant={
                                  r.isFollowUpDone ? "default" : "outline"
                                }
                                className="mt-1 w-fit"
                              >
                                {r.isFollowUpDone ? "Done" : "Pending"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No notes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped by student view */}
      {!loading && groupedByStudent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Notes by Student ({groupedByStudent.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedByStudent.map((g) => (
              <div key={g.studentId} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{g.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.studentPhone}
                    </p>
                  </div>
                  <Badge variant="secondary">{g.entries.length} note(s)</Badge>
                </div>
                <div className="space-y-2">
                  {g.entries.map((e) => (
                    <div
                      key={e.id}
                      className="rounded border-l-2 border-langford-red bg-muted/30 p-2 text-sm"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={TYPE_VARIANTS[e.type] ?? "secondary"}
                          className="text-[10px]"
                        >
                          {TYPE_LABELS[e.type] ?? e.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {e.createdByName || "—"} ·{" "}
                          {formatDateTime(e.createdAt as unknown as Timestamp)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{e.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
