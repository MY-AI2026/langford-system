"use client";

import Link from "next/link";
import { Student } from "@/lib/types";
import { StudentStatusBadge } from "./student-status-badge";
import { formatDate, formatCurrency, formatPhone } from "@/lib/utils/format";
import { PAYMENT_STATUS_CONFIG } from "@/lib/utils/constants";
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
import { cn } from "@/lib/utils";

interface StudentListTableProps {
  students: Student[];
  showSalesRep?: boolean;
}

export function StudentListTable({
  students,
  showSalesRep = false,
}: StudentListTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No students found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lead Source</TableHead>
            {showSalesRep && <TableHead>Sales Rep</TableHead>}
            <TableHead>Payment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const paymentConfig =
              PAYMENT_STATUS_CONFIG[student.paymentSummary.paymentStatus];
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <Link
                    href={`/students/${student.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {student.fullName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPhone(student.phone)}
                </TableCell>
                <TableCell>
                  <StudentStatusBadge status={student.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {student.leadSource}
                </TableCell>
                {showSalesRep && (
                  <TableCell className="text-muted-foreground">
                    {student.assignedSalesRepName}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <Badge
                      variant="secondary"
                      className={cn(
                        paymentConfig.bgColor,
                        paymentConfig.color,
                        "border-0 w-fit"
                      )}
                    >
                      {paymentConfig.label}
                    </Badge>
                    {student.paymentSummary.remainingBalance > 0 && (
                      <span className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(student.paymentSummary.remainingBalance)}{" "}
                        remaining
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(student.registrationDate)}
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`}>
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
