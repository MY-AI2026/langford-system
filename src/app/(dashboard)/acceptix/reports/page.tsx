"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import {
  buildReport,
  ReportResult,
  REPORT_PRESETS,
} from "@/lib/services/reg-report-service";
import {
  commissionFor,
  commissionStatusOf,
  markCommissionDisbursed,
  unmarkCommissionDisbursed,
  markManyCommissionsDisbursed,
} from "@/lib/services/reg-student-service";
import { subscribeToActiveCourses } from "@/lib/services/reg-course-service";
import { subscribeToAcceptixAgents } from "@/lib/services/reg-agent-service";
import { exportReportToExcel } from "@/lib/registration/excel-export";
import { exportReportToPdf } from "@/lib/registration/pdf-export";
import { RegCourse, RegStudent, User } from "@/lib/types";
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
  BadgeCheck,
  RotateCcw,
  Wallet,
} from "lucide-react";

function ReportsContent() {
  const { t } = useLanguage();
  const { userData } = useAuth();
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
  /** Set of student ids currently being written, so we can disable their row. */
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const actor = userData
    ? { uid: userData.uid, displayName: userData.displayName, role: userData.role }
    : null;

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
      toast.error(t("pickStartAndEndDate"));
      return;
    }
    if (fromDate > toDate) {
      toast.error(t("startDateBeforeEndDate"));
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
      toast.error(t("failedToLoadReport"));
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

  // ── Commission disbursement actions ────────────────────────────────────────
  function withBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleToggleDisbursed(studentId: string, currentlyDisbursed: boolean) {
    if (!actor) {
      toast.error(t("sessionNotReady"));
      return;
    }
    withBusy(studentId, true);
    try {
      if (currentlyDisbursed) {
        await unmarkCommissionDisbursed(studentId, actor);
        toast.success(t("revertedToPending"));
      } else {
        await markCommissionDisbursed(studentId, {}, actor);
        toast.success(t("commissionMarkedDisbursed"));
      }
      await runReport();
    } catch (e) {
      console.error("[reports] toggle disbursed failed:", e);
      toast.error(t("couldntUpdateRetry"));
    } finally {
      withBusy(studentId, false);
    }
  }

  async function handleSettleAllPending() {
    if (!actor || !report) return;
    const pendingIds = report.students
      .filter((s) => commissionStatusOf(s) === "pending" && commissionFor(s) > 0)
      .map((s) => s.id);
    if (pendingIds.length === 0) {
      toast.info(t("nothingPendingInView"));
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `${t("markCommissionsConfirmPrefix")} ${pendingIds.length} ${t("markCommissionsConfirmSuffix")}`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const { ok, failed } = await markManyCommissionsDisbursed(pendingIds, {}, actor);
      if (failed === 0) toast.success(`${ok} ${t("commissionsMarkedDisbursed")}`);
      else toast.warning(`${ok} ${t("doneCount")}، ${failed} ${t("failedRetryRest")}`);
      await runReport();
    } catch (e) {
      console.error("[reports] settle all failed:", e);
      toast.error(t("bulkDisbursementFailed"));
    } finally {
      setLoading(false);
    }
  }

  function handleExcel() {
    if (!report) {
      toast.error(t("runReportFirst"));
      return;
    }
    if (report.totals.studentCount === 0) {
      toast.info(t("reportEmptyNoStudents"));
      return;
    }
    exportReportToExcel(report, "acceptix-report");
    toast.success(t("excelDownloaded"));
  }

  function handlePdf() {
    if (!report) {
      toast.error(t("runReportFirst"));
      return;
    }
    if (report.totals.studentCount === 0) {
      toast.info(t("reportEmptyNoStudents"));
      return;
    }
    const ok = exportReportToPdf(report);
    if (!ok) {
      toast.error(t("browserBlockingPopups"));
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
            {t("reports")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("reportsPageSubtitle")}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel} disabled={!report || loading}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            {t("exportExcel")}
          </Button>
          <Button variant="outline" onClick={handlePdf} disabled={!report || loading}>
            <Printer className="ml-2 h-4 w-4" />
            {t("exportPdf")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            {t("filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>{t("range")}</Label>
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
                  <SelectItem value="custom">{t("custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">{t("from")}</Label>
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
              <Label htmlFor="to">{t("to")}</Label>
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
              <Label>{t("agent")}</Label>
              <Select
                value={agentFilter}
                onValueChange={(v) => setAgentFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allAgents")}</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.uid} value={a.uid}>
                      {a.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("course")}</Label>
              <Select
                value={courseFilter}
                onValueChange={(v) => setCourseFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCourses")}</SelectItem>
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
              {t("runReport")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("students")}</p>
            <p className="mt-1 text-2xl font-bold">
              {loading ? "—" : totals?.studentCount.toLocaleString("en-US")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalFees")}</p>
            <p className="mt-1 text-2xl font-bold" dir="ltr">
              {loading
                ? "—"
                : `${(totals?.totalFees ?? 0).toLocaleString("en-US")} ${currency}`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("totalCommission10")}</p>
            <p className="mt-1 text-2xl font-bold text-primary" dir="ltr">
              {loading
                ? "—"
                : `${(totals?.totalCommission ?? 0).toLocaleString("en-US")} ${currency}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disbursement split */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("commissionDisbursed")}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                {loading
                  ? "—"
                  : `${(totals?.disbursedCommission ?? 0).toLocaleString("en-US")} ${currency}`}
              </p>
            </div>
            <BadgeCheck className="h-8 w-8 text-emerald-500/60" />
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("commissionOutstanding")}</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                {loading
                  ? "—"
                  : `${(totals?.outstandingCommission ?? 0).toLocaleString("en-US")} ${currency}`}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-amber-500/60" />
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title={t("agentSummary")}
          loading={loading}
          showOutstanding
          rows={memoAgents.map((a) => ({
            name: a.agentName,
            count: a.studentCount,
            fees: a.totalFees,
            commission: a.totalCommission,
            outstanding: a.outstandingCommission,
            currency: a.currency,
          }))}
        />
        <BreakdownTable
          title={t("courseSummary")}
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

      {/* Per-student commission disbursement */}
      <DisbursementTable
        students={report?.students ?? []}
        loading={loading}
        busyIds={busyIds}
        currency={currency}
        onToggle={handleToggleDisbursed}
        onSettleAll={handleSettleAllPending}
      />
    </div>
  );
}

function DisbursementTable({
  students,
  loading,
  busyIds,
  currency,
  onToggle,
  onSettleAll,
}: {
  students: RegStudent[];
  loading: boolean;
  busyIds: Set<string>;
  currency: string;
  onToggle: (studentId: string, currentlyDisbursed: boolean) => void;
  onSettleAll: () => void;
}) {
  const { t } = useLanguage();
  const pendingCount = students.filter(
    (s) => commissionStatusOf(s) === "pending" && commissionFor(s) > 0
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" />
          {t("commissionDisbursement")}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={onSettleAll}
          disabled={loading || pendingCount === 0}
        >
          <BadgeCheck className="ml-2 h-4 w-4" />
          {t("settleAllPending")} ({pendingCount})
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noStudentsInRange")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("agent")}</TableHead>
                <TableHead>{t("course")}</TableHead>
                <TableHead className="text-right">{t("commission")}</TableHead>
                <TableHead>{t("payout")}</TableHead>
                <TableHead className="text-right">{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const disbursed = commissionStatusOf(s) === "disbursed";
                const busy = busyIds.has(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.createdByName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.courseName || "—"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-right font-medium text-primary">
                      {commissionFor(s).toLocaleString("en-US")} {s.currency || currency}
                    </TableCell>
                    <TableCell>
                      {disbursed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <BadgeCheck className="h-3 w-3" />
                          {t("disbursed")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          {t("pending")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={disbursed ? "ghost" : "outline"}
                        disabled={busy}
                        onClick={() => onToggle(s.id, disbursed)}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : disbursed ? (
                          <>
                            <RotateCcw className="ml-1 h-3.5 w-3.5" />
                            {t("undo")}
                          </>
                        ) : (
                          <>
                            <BadgeCheck className="ml-1 h-3.5 w-3.5" />
                            {t("markPaid")}
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface BreakdownRow {
  name: string;
  count: number;
  fees: number;
  commission: number;
  outstanding?: number;
  currency: string;
}

function BreakdownTable({
  title,
  rows,
  loading,
  showOutstanding = false,
}: {
  title: string;
  rows: BreakdownRow[];
  loading: boolean;
  showOutstanding?: boolean;
}) {
  const { t } = useLanguage();
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
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("count")}</TableHead>
                <TableHead>{t("fee")}</TableHead>
                <TableHead>{t("commission")}</TableHead>
                {showOutstanding && <TableHead>{t("outstanding")}</TableHead>}
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
                  {showOutstanding && (
                    <TableCell
                      dir="ltr"
                      className={
                        (r.outstanding ?? 0) > 0
                          ? "font-medium text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }
                    >
                      {(r.outstanding ?? 0).toLocaleString("en-US")} {r.currency}
                    </TableCell>
                  )}
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
