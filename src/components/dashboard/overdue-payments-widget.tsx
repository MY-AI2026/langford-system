"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/contexts/language-context";
import { Student } from "@/lib/types";
import Link from "next/link";

interface OverduePaymentsWidgetProps {
  students: Student[];
}

export function OverduePaymentsWidget({ students }: OverduePaymentsWidgetProps) {
  const { t } = useLanguage();
  const overdueStudents = (students || []).filter(
    (s) => s.paymentSummary?.hasOverdue || s.paymentSummary?.paymentStatus === "pending"
  );

  const totalOverdue = overdueStudents.reduce(
    (sum, s) => sum + (s.paymentSummary?.remainingBalance || 0),
    0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{t("overduePayments")}</CardTitle>
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      </CardHeader>
      <CardContent>
        {overdueStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOverduePayments")}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-2xl font-bold text-langford-red">
              {formatCurrency(totalOverdue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {overdueStudents.length} {t("studentsWithPendingPayments")}
            </p>
            <div className="space-y-2">
              {overdueStudents.slice(0, 5).map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
                >
                  <span className="truncate">{student.fullName}</span>
                  <span className="font-medium text-langford-red">
                    {formatCurrency(student.paymentSummary?.remainingBalance || 0)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
