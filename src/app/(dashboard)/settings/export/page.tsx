"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeToStudents } from "@/lib/services/student-service";
import { Student } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { exportToExcel } from "@/lib/utils/excel";
import { exportToPdf } from "@/lib/utils/pdf-report";
import { FileSpreadsheet, FileText, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function DataExportPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <DataExportContent />
    </RoleGate>
  );
}

function DataExportContent() {
  const { firebaseUser } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeToStudents(
      { role: "admin", userId: firebaseUser.uid, showArchived: true },
      setStudents
    );
    return () => unsub();
  }, [firebaseUser]);

  function exportStudentsExcel() {
    exportToExcel<Student>({
      filename: "langford-students",
      sheetName: t("students"),
      columns: [
        { label: t("name"), get: (s) => s.fullName, width: 28 },
        { label: t("phone"), get: (s) => s.phone, width: 14 },
        { label: t("civilId"), get: (s) => s.civilId || "", width: 16 },
        { label: t("email"), get: (s) => s.email || "", width: 24 },
        { label: t("status"), get: (s) => s.status, width: 12 },
        { label: t("leadSource"), get: (s) => s.leadSource, width: 16 },
        { label: t("salesRep"), get: (s) => s.assignedSalesRepName, width: 18 },
        { label: t("totalFees"), get: (s) => s.paymentSummary?.totalFees ?? 0, width: 14 },
        { label: t("amountPaid"), get: (s) => s.paymentSummary?.amountPaid ?? 0, width: 12 },
        { label: t("remaining"), get: (s) => s.paymentSummary?.remainingBalance ?? 0, width: 12 },
        {
          label: t("registrationDate"),
          get: (s) => formatDate(s.registrationDate ?? s.createdAt),
          width: 14,
        },
      ],
      rows: students,
    });
    toast.success(t("excelDownloaded"));
  }

  function exportStudentsPdf() {
    const totalPaid = students.reduce(
      (sum, s) => sum + (s.paymentSummary?.amountPaid ?? 0),
      0
    );
    const totalOutstanding = students.reduce(
      (sum, s) => sum + (s.paymentSummary?.remainingBalance ?? 0),
      0
    );
    const ok = exportToPdf({
      title: t("students"),
      summary: [
        { label: t("totalStudents"), value: String(students.length) },
        { label: t("amountPaid"), value: formatCurrency(totalPaid), tone: "green" },
        { label: t("outstandingBalance"), value: formatCurrency(totalOutstanding), tone: "amber" },
      ],
      sections: [
        {
          title: t("students"),
          columns: [
            { label: t("name") },
            { label: t("phone") },
            { label: t("status") },
            { label: t("salesRep") },
            { label: t("amountPaid"), align: "end" },
            { label: t("remaining"), align: "end" },
          ],
          rows: students.map((s) => [
            s.fullName || "—",
            s.phone || "—",
            s.status || "—",
            s.assignedSalesRepName || "—",
            formatCurrency(s.paymentSummary?.amountPaid ?? 0),
            formatCurrency(s.paymentSummary?.remainingBalance ?? 0),
          ]),
          emptyText: t("noStudents"),
        },
      ],
    });
    if (!ok) toast.error(t("browserBlockingPopups"));
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("dataExport")} description={t("dataExportDescription")} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">{t("students")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {students.length} {t("studentsCount")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={exportStudentsExcel}
              disabled={students.length === 0}
            >
              <FileSpreadsheet className="me-2 h-4 w-4" />
              {t("downloadExcel")}
            </Button>
            <Button
              variant="outline"
              onClick={exportStudentsPdf}
              disabled={students.length === 0}
            >
              <FileText className="me-2 h-4 w-4" />
              {t("exportPdf")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
