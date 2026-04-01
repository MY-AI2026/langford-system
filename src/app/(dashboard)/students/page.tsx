"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StudentListTable } from "@/components/students/student-list-table";
import { StudentSearchBar } from "@/components/students/student-search-bar";
import { subscribeToStudents } from "@/lib/services/student-service";
import { Student, StudentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "string") return new Date(val);
  if (typeof (val as { toDate?: () => Date }).toDate === "function")
    return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return null;
}

function exportToCSV(students: Student[]) {
  const headers = [
    "Full Name", "Phone", "Email", "Status", "Lead Source",
    "Sales Rep", "Payment Status", "Total Fees", "Amount Paid",
    "Remaining Balance", "Registration Date",
  ];

  const rows = students.map((s) => [
    s.fullName,
    s.phone,
    s.email || "",
    s.status,
    s.leadSource,
    s.assignedSalesRepName,
    s.paymentSummary?.paymentStatus ?? "",
    s.paymentSummary?.totalFees ?? 0,
    s.paymentSummary?.amountPaid ?? 0,
    s.paymentSummary?.remainingBalance ?? 0,
    formatDate(s.registrationDate ?? s.createdAt),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudentsPage() {
  const { role, firebaseUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!firebaseUser || !role) return;
    const unsubscribe = subscribeToStudents(
      {
        role,
        userId: firebaseUser.uid,
        status: statusFilter !== "all" ? statusFilter : undefined,
        showArchived,
        searchQuery: search,
      },
      setStudents
    );
    return () => unsubscribe();
  }, [firebaseUser, role, statusFilter, showArchived, search]);

  // Client-side date filter
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${filtered.length} student(s)${dateFrom || dateTo ? " (filtered)" : ""}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportToCSV(filtered)}
              disabled={filtered.length === 0}
              title="Export to CSV / Excel"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/students/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </Link>
          </div>
        }
      />

      <StudentSearchBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        isAdmin={role === "admin"}
      />

      <StudentListTable
        students={filtered}
        showSalesRep={role === "admin"}
      />
    </div>
  );
}
