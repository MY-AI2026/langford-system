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
    <div className="rounded-lg border">
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
  );
}
