"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import {
  buildReport,
  ReportResult,
  REPORT_PRESETS,
} from "@/lib/services/reg-report-service";
import { subscribeToActiveCourses } from "@/lib/services/reg-course-service";
import { subscribeToAcceptixAgents } from "@/lib/services/reg-agent-service";
import { exportReportToExcel } from "@/lib/registration/excel-export";
import { exportReportToPdf } from "@/lib/registration/pdf-export";
import { RegCourse, User } from "@/lib/types";
import { REG_DEFAULT_CURRENCY } from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  FileBarChart,
  FileSpreadsheet,
  Printer,
  Loader2,
  Filter,
} from "lucide-react";

function ReportsContent() {
  const [courses, setCourses] = useState<RegCourse[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Default to "this month"
  const [presetId, setPresetId] = useState<string>("this-month");
  const initial = REPORT_PRESETS[0].range();
  const [from, setFrom] = useState<string>(toInputDate(initial.from));
  const [to, setTo] = useState<string>(toInputDate(initial.to));
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u1 = subscribeToActiveCourses(setCourses);
    const u2 = subscribeToAcceptixAgents(setAgents);
    return () => {
      u1();
      u2();
    };
  }, []);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = REPORT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const range = preset.range();
    setFrom(toInputDate(range.from));
    setTo(toInputDate(range.to));
  }

  async function runReport() {
    const fromDate = fromInputDate(from, "start");
    const toDate = fromInputDate(to, "end");
    if (!fromDate || !toDate) {
      toast.error("Pick a start and end date");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setLoading(true);
    try {
      const r = await buildReport({
        from: fromDate,
        to: toDate,
        agentUid: agentFilter,
        courseId: courseFilter,
      });
      setReport(r);
    } catch (e) {
      console.error("[reports] runReport failed:", e);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run on first mount + whenever filters change (debounced via the
  // button click, but the initial render runs once on mount).
  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExcel() {
    if (!report) {
      toast.error("Run the report first");
      return;
    }
    if (report.totals.studentCount === 0) {
      toast.info("Report is empty — no students in this range");
      return;
    }
    exportReportToExcel(report, "acceptix-report");
    toast.success("Excel downloaded");
  }

  function handlePdf() {
    if (!report) {
      toast.error("Run the report first");
      return;
    }
    if (report.totals.studentCount === 0) {
      toast.info("Report is empty — no students in this range");
      return;
    }
    const ok = exportReportToPdf(report);
    if (!ok) {
      toast.error(
        "Your browser is blocking new windows — allow pop-ups for Langford."
      );
    }
  }

  const totals = report?.totals;
  const currency = totals?.currency ?? REG_DEFAULT_CURRENCY;

  const memoAgents = useMemo(() => report?.byAgent ?? [], [report]);
  const memoCourses = useMemo(() => report?.byCourse ?? [], [report]);

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileBarChart className="h-6 w-6 text-primary" />
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly commission report + grouping by agent and course + Excel & PDF export.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel} disabled={!report || loading}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handlePdf} disabled={!report || loading}>
            <Printer className="ml-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Range</Label>
              <Select
                value={presetId}
                onValueChange={(v) => applyPreset(v ?? "this-month")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.labelAr}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPresetId("custom");
                }}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPresetId("custom");
                }}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>Agent</Label>
              <Select
                value={agentFilter}
                onValueChange={(v) => setAgentFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.uid} value={a.uid}>
                      {a.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={courseFilter}
                onValueChange={(v) => setCourseFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-start">
            <Button onClick={runReport} disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="mt-1 text-2xl font-bold">
              {loading ? "—" : totals?.studentCount.toLocaleString("en-US")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="mt-1 text-2xl font-bold" dir="ltr">
              {loading
                ? "—"
                : `${(totals?.totalFees ?? 0).toLocaleString("en-US")} ${currency}`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Commission (10%)</p>
            <p className="mt-1 text-2xl font-bold text-primary" dir="ltr">
              {loading
                ? "—"
                : `${(totals?.totalCommission ?? 0).toLocaleString("en-US")} ${currency}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="Agent Summary"
          loading={loading}
          rows={memoAgents.map((a) => ({
            name: a.agentName,
            count: a.studentCount,
            fees: a.totalFees,
            commission: a.totalCommission,
            currency: a.currency,
          }))}
        />
        <BreakdownTable
          title="Course Summary"
          loading={loading}
          rows={memoCourses.map((c) => ({
            name: c.courseName,
            count: c.studentCount,
            fees: c.totalFees,
            commission: c.totalCommission,
            currency: c.currency,
          }))}
        />
      </div>
    </div>
  );
}

interface BreakdownRow {
  name: string;
  count: number;
  fees: number;
  commission: number;
  currency: string;
}

function BreakdownTable({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: BreakdownRow[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.count.toLocaleString("en-US")}</TableCell>
                  <TableCell dir="ltr">
                    {r.fees.toLocaleString("en-US")} {r.currency}
                  </TableCell>
                  <TableCell dir="ltr" className="font-medium text-primary">
                    {r.commission.toLocaleString("en-US")} {r.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function toInputDate(d: Date): string {
  // yyyy-mm-dd for <input type="date">
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputDate(str: string, edge: "start" | "end"): Date | null {
  if (!str) return null;
  const parts = str.split("-").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  if (edge === "start") {
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export default function ReportsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGate>
  );
}
