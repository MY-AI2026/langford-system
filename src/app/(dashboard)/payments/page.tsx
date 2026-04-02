"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { subscribeToStudents } from "@/lib/services/student-service";
import { Student } from "@/lib/types";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

// Safe accessor for paymentSummary
function ps(student: Student) {
  return student.paymentSummary || {
    totalFees: 0,
    amountPaid: 0,
    remainingBalance: 0,
    paymentStatus: "pending" as const,
    hasOverdue: false,
  };
}

export default function PaymentsPage() {
  const { role, firebaseUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "partial" | "paid">("all");

  useEffect(() => {
    if (!firebaseUser || !role) return;
    try {
      const unsub = subscribeToStudents(
        { role, userId: firebaseUser.uid },
        (data) => setStudents(data || [])
      );
      return () => unsub();
    } catch {
      setStudents([]);
    }
  }, [firebaseUser, role]);

  const filtered =
    filter === "all"
      ? students
      : students.filter((s) => ps(s).paymentStatus === filter);

  const totalFees = students.reduce((sum, s) => sum + (ps(s).totalFees || 0), 0);
  const totalPaid = students.reduce((sum, s) => sum + (ps(s).amountPaid || 0), 0);
  const totalPending = students.reduce((sum, s) => sum + (ps(s).remainingBalance || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all student payments and balances"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-langford-red">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex justify-end">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Total Fees</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((student) => {
              const summary = ps(student);
              const config = PAYMENT_STATUS_CONFIG[summary.paymentStatus] || PAYMENT_STATUS_CONFIG["pending"];
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
                  <TableCell>{formatCurrency(summary.totalFees || 0)}</TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(summary.amountPaid || 0)}
                  </TableCell>
                  <TableCell className="text-langford-red">
                    {formatCurrency(summary.remainingBalance || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(config?.bgColor, config?.color, "border-0")}
                    >
                      {config?.label || "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
