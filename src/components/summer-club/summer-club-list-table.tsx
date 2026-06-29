"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { SummerClubStudent } from "@/lib/types";
import { formatDate, formatCurrency, formatPhone } from "@/lib/utils/format";
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
import { Eye, Sun } from "lucide-react";

interface Props {
  students: SummerClubStudent[];
  showSalesRep?: boolean;
}

export function SummerClubListTable({ students, showSalesRep = false }: Props) {
  const { t } = useLanguage();
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed">
        <EmptyState icon={Sun} title={t("noData")} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("phone")}</TableHead>
            <TableHead>{t("gender")}</TableHead>
            <TableHead>{t("age")}</TableHead>
            <TableHead>{t("registered")}</TableHead>
            {showSalesRep && <TableHead>{t("salesRep")}</TableHead>}
            <TableHead>{t("fees")}</TableHead>
            <TableHead>{t("amountPaid")}</TableHead>
            <TableHead>{t("remaining")}</TableHead>
            <TableHead>{t("registrationDate")}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => {
            const ps = s.paymentSummary || {
              totalFees: 0,
              amountPaid: 0,
              remainingBalance: 0,
              paymentStatus: "pending" as const,
            };
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    href={`/summer-club/${s.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {s.fullName || "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPhone(s.phone || "")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      s.gender === "female"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {s.gender === "female" ? t("female") : t("male")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.age ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      s.isRegistered
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {s.isRegistered ? t("yes") : t("no")}
                  </Badge>
                </TableCell>
                {showSalesRep && (
                  <TableCell className="text-muted-foreground">
                    {s.assignedSalesRepName || "—"}
                  </TableCell>
                )}
                <TableCell>{formatCurrency(ps.totalFees || 0)}</TableCell>
                <TableCell className="text-emerald-700">
                  {formatCurrency(ps.amountPaid || 0)}
                </TableCell>
                <TableCell className="text-red-700">
                  {formatCurrency(ps.remainingBalance || 0)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(s.registrationDate || s.createdAt)}
                </TableCell>
                <TableCell>
                  <Link href={`/summer-club/${s.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
