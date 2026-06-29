"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { PageHeader } from "@/components/layout/page-header";
import { RoleGate } from "@/components/auth/role-gate";
import { SummerClubListTable } from "@/components/summer-club/summer-club-list-table";
import { subscribeToSummerClubStudents } from "@/lib/services/summer-club-service";
import { SummerClubStudent, Gender } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Sun } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";

function exportCSV(students: SummerClubStudent[]) {
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
    "ملاحظات",
  ];
  const rows = students.map((s) => [
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
    (s.notes ?? "").replace(/\n/g, " "),
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
  a.download = `summer-club_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SummerClubPage() {
  const { role, firebaseUser } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<SummerClubStudent[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [regFilter, setRegFilter] = useState<"all" | "yes" | "no">("all");

  useEffect(() => {
    if (!firebaseUser || !role) return;
    const unsub = subscribeToSummerClubStudents(
      {
        role,
        userId: firebaseUser.uid,
        gender: genderFilter,
        registered: regFilter,
        searchQuery: search,
      },
      setStudents
    );
    return () => unsub();
  }, [firebaseUser, role, genderFilter, regFilter, search]);

  const stats = useMemo(() => {
    const total = students.length;
    const males = students.filter((s) => s.gender === "male").length;
    const females = students.filter((s) => s.gender === "female").length;
    const registered = students.filter((s) => s.isRegistered).length;
    const totalFees = students.reduce(
      (sum, s) => sum + (s.paymentSummary?.totalFees ?? 0),
      0
    );
    const totalPaid = students.reduce(
      (sum, s) => sum + (s.paymentSummary?.amountPaid ?? 0),
      0
    );
    const totalRemaining = students.reduce(
      (sum, s) => sum + (s.paymentSummary?.remainingBalance ?? 0),
      0
    );
    return { total, males, females, registered, totalFees, totalPaid, totalRemaining };
  }, [students]);

  return (
    <RoleGate allowedRoles={["admin", "sales", "accountant", "coordinator"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("summerClub")}
          description={`${stats.total} ${t("studentsCountLabel")}${role === "sales" ? ` (${t("yourDataOnly")})` : ""}`}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportCSV(students)}
                disabled={students.length === 0}
              >
                <Download className="me-2 h-4 w-4" />
                {t("export")}
              </Button>
              {role !== "accountant" && (
                <Link href="/summer-club/new">
                  <Button>
                    <Plus className="me-2 h-4 w-4" />
                    {t("addStudent")}
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("totalStudents")}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Sun className="h-8 w-8 text-amber-500" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("males")}: {stats.males} • {t("females")}: {stats.females}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{t("registeredCount")}</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.registered}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("from")} {stats.total} {t("studentsCountLabel")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{t("totalPaid")}</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatCurrency(stats.totalPaid)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("from")} {formatCurrency(stats.totalFees)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{t("totalRemaining")}</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(stats.totalRemaining)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t("searchByNameOrPhone")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as Gender | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allGenders")}</SelectItem>
              <SelectItem value="male">{t("male")}</SelectItem>
              <SelectItem value="female">{t("female")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={regFilter}
            onValueChange={(v) => setRegFilter(v as "all" | "yes" | "no")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="yes">{t("registered")}</SelectItem>
              <SelectItem value="no">{t("notRegistered")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SummerClubListTable
          students={students}
          showSalesRep={role === "admin" || role === "accountant"}
        />
      </div>
    </RoleGate>
  );
}
