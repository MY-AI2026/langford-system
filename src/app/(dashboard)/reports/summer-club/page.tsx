"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/auth/role-gate";
import { subscribeToSummerClubStudents } from "@/lib/services/summer-club-service";
import { SummerClubStudent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Sun } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "string") return new Date(val);
  if (typeof (val as { toDate?: () => Date }).toDate === "function")
    return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return null;
}

export default function SummerClubReportPage() {
  const { role, firebaseUser } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<SummerClubStudent[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!firebaseUser || !role) return;
    const unsub = subscribeToSummerClubStudents(
      { role, userId: firebaseUser.uid, gender: "all", registered: "all" },
      setStudents
    );
    return () => unsub();
  }, [firebaseUser, role]);

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return students;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return students.filter((s) => {
      const d = toDate(s.registrationDate ?? s.createdAt);
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [students, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const males = filtered.filter((s) => s.gender === "male");
    const females = filtered.filter((s) => s.gender === "female");
    const registered = filtered.filter((s) => s.isRegistered);
    const sumFees = (arr: SummerClubStudent[]) =>
      arr.reduce((s, x) => s + (x.paymentSummary?.totalFees ?? 0), 0);
    const sumPaid = (arr: SummerClubStudent[]) =>
      arr.reduce((s, x) => s + (x.paymentSummary?.amountPaid ?? 0), 0);
    const sumRemaining = (arr: SummerClubStudent[]) =>
      arr.reduce((s, x) => s + (x.paymentSummary?.remainingBalance ?? 0), 0);

    return {
      total: filtered.length,
      registered: registered.length,
      males: {
        count: males.length,
        registered: males.filter((s) => s.isRegistered).length,
        fees: sumFees(males),
        paid: sumPaid(males),
        remaining: sumRemaining(males),
      },
      females: {
        count: females.length,
        registered: females.filter((s) => s.isRegistered).length,
        fees: sumFees(females),
        paid: sumPaid(females),
        remaining: sumRemaining(females),
      },
      totals: {
        fees: sumFees(filtered),
        paid: sumPaid(filtered),
        remaining: sumRemaining(filtered),
      },
    };
  }, [filtered]);

  // Group by sales rep (admin/accountant only)
  const bySalesRep = useMemo(() => {
    if (role === "sales") return [];
    const map = new Map<
      string,
      {
        name: string;
        count: number;
        registered: number;
        fees: number;
        paid: number;
        remaining: number;
      }
    >();
    for (const s of filtered) {
      const key = s.assignedSalesRepId;
      const cur = map.get(key) ?? {
        name: s.assignedSalesRepName,
        count: 0,
        registered: 0,
        fees: 0,
        paid: 0,
        remaining: 0,
      };
      cur.count++;
      if (s.isRegistered) cur.registered++;
      cur.fees += s.paymentSummary?.totalFees ?? 0;
      cur.paid += s.paymentSummary?.amountPaid ?? 0;
      cur.remaining += s.paymentSummary?.remainingBalance ?? 0;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filtered, role]);

  function exportReport() {
    const headers = [
      "الاسم",
      "التلفون",
      "النوع",
      "السن",
      "ولي الأمر",
      "تلفون ولي الأمر",
      "مسجل",
      "السيلز",
      "الرسوم",
      "المدفوع",
      "المتبقي",
      "تاريخ التسجيل",
    ];
    const rows = filtered.map((s) => [
      s.fullName,
      s.phone,
      s.gender === "female" ? "أنثى" : "ذكر",
      s.age ?? "",
      s.guardianName ?? "",
      s.guardianPhone ?? "",
      s.isRegistered ? "نعم" : "لا",
      s.assignedSalesRepName,
      s.paymentSummary?.totalFees ?? 0,
      s.paymentSummary?.amountPaid ?? 0,
      s.paymentSummary?.remainingBalance ?? 0,
      formatDate(s.registrationDate ?? s.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summer-club-report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RoleGate allowedRoles={["admin", "sales", "accountant", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("summerClubReport")}
          description={
            role === "sales"
              ? t("yourDataOnly")
              : `${stats.total} ${t("studentLabel")} • ${stats.registered} ${t("registeredLabel")}`
          }
          action={
            <Button variant="outline" onClick={exportReport} disabled={filtered.length === 0}>
              <Download className="me-2 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          }
        />

        {/* Date filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label htmlFor="from">{t("from")}</Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to">{t("to")}</Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              {t("clear")}
            </Button>
          )}
        </div>

        {/* Gender breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("males")}</span>
                <Sun className="h-5 w-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label={t("total")} value={String(stats.males.count)} />
              <Row label={t("registeredCount")} value={String(stats.males.registered)} />
              <Row label={t("totalFees")} value={formatCurrency(stats.males.fees)} />
              <Row
                label={t("amountPaid")}
                value={formatCurrency(stats.males.paid)}
                valueClass="text-emerald-700"
              />
              <Row
                label={t("remaining")}
                value={formatCurrency(stats.males.remaining)}
                valueClass="text-red-700"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("females")}</span>
                <Sun className="h-5 w-5 text-pink-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label={t("total")} value={String(stats.females.count)} />
              <Row label={t("registeredCount")} value={String(stats.females.registered)} />
              <Row label={t("totalFees")} value={formatCurrency(stats.females.fees)} />
              <Row
                label={t("amountPaid")}
                value={formatCurrency(stats.females.paid)}
                valueClass="text-emerald-700"
              />
              <Row
                label={t("remaining")}
                value={formatCurrency(stats.females.remaining)}
                valueClass="text-red-700"
              />
            </CardContent>
          </Card>
        </div>

        {/* Grand totals */}
        <Card>
          <CardHeader>
            <CardTitle>{t("grandTotal")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Row label={t("totalFees")} value={formatCurrency(stats.totals.fees)} />
            <Row
              label={t("totalPaid")}
              value={formatCurrency(stats.totals.paid)}
              valueClass="text-emerald-700"
            />
            <Row
              label={t("totalRemaining")}
              value={formatCurrency(stats.totals.remaining)}
              valueClass="text-red-700"
            />
          </CardContent>
        </Card>

        {/* By sales rep — admin/accountant/coordinator only */}
        {role !== "sales" && bySalesRep.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("distributionBySalesRep")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("salesRep")}</TableHead>
                    <TableHead>{t("studentsCount")}</TableHead>
                    <TableHead>{t("registeredCount")}</TableHead>
                    <TableHead>{t("totalFees")}</TableHead>
                    <TableHead>{t("amountPaid")}</TableHead>
                    <TableHead>{t("remaining")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySalesRep.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{r.registered}</TableCell>
                      <TableCell>{formatCurrency(r.fees)}</TableCell>
                      <TableCell className="text-emerald-700">
                        {formatCurrency(r.paid)}
                      </TableCell>
                      <TableCell className="text-red-700">
                        {formatCurrency(r.remaining)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGate>
  );
}

function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-base font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
