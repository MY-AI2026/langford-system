"use client";

import Link from "next/link";
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
import { Eye } from "lucide-react";

interface Props {
  students: SummerClubStudent[];
  showSalesRep?: boolean;
}

export function SummerClubListTable({ students, showSalesRep = false }: Props) {
  if (students.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>التلفون</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>السن</TableHead>
            <TableHead>مسجل</TableHead>
            {showSalesRep && <TableHead>السيلز</TableHead>}
            <TableHead>الرسوم</TableHead>
            <TableHead>المدفوع</TableHead>
            <TableHead>المتبقي</TableHead>
            <TableHead>تاريخ التسجيل</TableHead>
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
                    {s.gender === "female" ? "أنثى" : "ذكر"}
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
                    {s.isRegistered ? "نعم" : "لا"}
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
