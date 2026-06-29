"use client";

import Link from "next/link";
import { Student } from "@/lib/types";
import { StudentStatusBadge } from "./student-status-badge";
import { formatDate, formatCurrency, formatPhone } from "@/lib/utils/format";
import { PAYMENT_STATUS_CONFIG } from "@/lib/utils/constants";
import { useLanguage } from "@/contexts/language-context";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Eye, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppButton } from "./whatsapp-button";
import { QuickNoteButton } from "./quick-note-button";

interface StudentListTableProps {
  students: Student[];
  showSalesRep?: boolean;
}

export function StudentListTable({
  students,
  showSalesRep = false,
}: StudentListTableProps) {
  const { t } = useLanguage();
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed">
        <EmptyState
          icon={GraduationCap}
          title={t("noStudents")}
          description={t("noStudentsHint")}
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards (easier to read than a horizontally-scrolling
          table on small screens) */}
      <div className="space-y-3 md:hidden">
        {students.map((student) => {
          const paymentStatus =
            student.paymentSummary?.paymentStatus || "pending";
          const paymentConfig =
            PAYMENT_STATUS_CONFIG[paymentStatus] ||
            PAYMENT_STATUS_CONFIG["pending"];
          const remainingBalance =
            student.paymentSummary?.remainingBalance ?? 0;
          return (
            <div
              key={student.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/students/${student.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {student.fullName || "—"}
                </Link>
                <StudentStatusBadge status={student.status || "new"} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">{t("phone")}</dt>
                <dd className="text-end">{formatPhone(student.phone || "")}</dd>
                <dt className="text-muted-foreground">{t("leadSource")}</dt>
                <dd className="text-end">{student.leadSource || "—"}</dd>
                {showSalesRep && (
                  <>
                    <dt className="text-muted-foreground">{t("salesRep")}</dt>
                    <dd className="text-end">
                      {student.assignedSalesRepName || "—"}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">{t("payments")}</dt>
                <dd className="text-end">
                  <Badge
                    variant="secondary"
                    className={cn(
                      paymentConfig?.bgColor,
                      paymentConfig?.color,
                      "border-0"
                    )}
                  >
                    {paymentConfig?.label || t("unpaid")}
                  </Badge>
                  {remainingBalance > 0 && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatCurrency(remainingBalance)} {t("remaining")}
                    </span>
                  )}
                </dd>
                <dt className="text-muted-foreground">{t("date")}</dt>
                <dd className="text-end">
                  {formatDate(student.registrationDate || student.createdAt)}
                </dd>
              </dl>
              <div className="mt-3 flex items-center justify-end gap-1 border-t pt-3">
                <WhatsAppButton
                  phone={student.phone || ""}
                  fullName={student.fullName || ""}
                  variant="icon"
                />
                <QuickNoteButton
                  studentId={student.id}
                  studentName={student.fullName || ""}
                  variant="icon"
                />
                <Link href={`/students/${student.id}`}>
                  <Button variant="ghost" size="icon" title={t("openStudent")}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / tablet: full table */}
      <div className="hidden rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("phone")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("leadSource")}</TableHead>
            {showSalesRep && <TableHead>{t("salesRep")}</TableHead>}
            <TableHead>{t("payments")}</TableHead>
            <TableHead>{t("date")}</TableHead>
            <TableHead className="w-32 text-center">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const paymentStatus = student.paymentSummary?.paymentStatus || "pending";
            const paymentConfig =
              PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG["pending"];
            const remainingBalance = student.paymentSummary?.remainingBalance ?? 0;
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <Link
                    href={`/students/${student.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {student.fullName || "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPhone(student.phone || "")}
                </TableCell>
                <TableCell>
                  <StudentStatusBadge status={student.status || "new"} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {student.leadSource || "—"}
                </TableCell>
                {showSalesRep && (
                  <TableCell className="text-muted-foreground">
                    {student.assignedSalesRepName || "—"}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <Badge
                      variant="secondary"
                      className={cn(
                        paymentConfig?.bgColor,
                        paymentConfig?.color,
                        "border-0 w-fit"
                      )}
                    >
                      {paymentConfig?.label || t("unpaid")}
                    </Badge>
                    {remainingBalance > 0 && (
                      <span className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(remainingBalance)}{" "}
                        {t("remaining")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(student.registrationDate || student.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <WhatsAppButton
                      phone={student.phone || ""}
                      fullName={student.fullName || ""}
                      variant="icon"
                    />
                    <QuickNoteButton
                      studentId={student.id}
                      studentName={student.fullName || ""}
                      variant="icon"
                    />
                    <Link href={`/students/${student.id}`}>
                      <Button variant="ghost" size="icon" title={t("openStudent")}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
