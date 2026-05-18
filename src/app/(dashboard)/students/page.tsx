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
import { exportToExcel } from "@/lib/utils/excel";

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "string") return new Date(val);
  if (typeof (val as { toDate?: () => Date }).toDate === "function")
    return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return null;
}

function downloadStudents(students: Student[]) {
  exportToExcel<Student>({
    filename: "students",
    sheetName: "Students",
    columns: [
      { label: "\u0627\u0644\u0627\u0633\u0645", get: (s) => s.fullName, width: 28 },
      { label: "\u0627\u0644\u062A\u0644\u064A\u0641\u0648\u0646", get: (s) => s.phone, width: 14 },
      { label: "Civil ID", get: (s) => s.civilId || "", width: 16 },
      { label: "\u0627\u0644\u0628\u0631\u064A\u062F", get: (s) => s.email || "", width: 24 },
      { label: "\u0627\u0644\u062D\u0627\u0644\u0629", get: (s) => s.status, width: 12 },
      { label: "\u0627\u0644\u0645\u0635\u062F\u0631", get: (s) => s.leadSource, width: 16 },
      { label: "\u0627\u0644\u0633\u064A\u0644\u0632", get: (s) => s.assignedSalesRepName, width: 18 },
      { label: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062F\u0641\u0639", get: (s) => s.paymentSummary?.paymentStatus ?? "", width: 12 },
      { label: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0648\u0645", get: (s) => s.paymentSummary?.totalFees ?? 0, width: 14 },
      { label: "\u0627\u0644\u0645\u062F\u0641\u0648\u0639", get: (s) => s.paymentSummary?.amountPaid ?? 0, width: 12 },
      { label: "\u0627\u0644\u0645\u062A\u0628\u0642\u064A", get: (s) => s.paymentSummary?.remainingBalance ?? 0, width: 12 },
      {
        label: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644",
        get: (s) => formatDate(s.registrationDate ?? s.createdAt),
        width: 14,
      },
    ],
    rows: students,
  });
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

    try {
      const unsubscribe = subscribeToStudents(
        {
          role,
          userId: firebaseUser.uid,
          status: statusFilter !== "all" ? statusFilter : undefined,
          showArchived,
          searchQuery: search,
        },
        (data) => {
          // Safely set students data
          try {
            setStudents(data || []);
          } catch (err) {
            console.error("Error setting students:", err);
            setStudents([]);
          }
        }
      );
      return () => {
        try {
          unsubscribe();
        } catch (err) {
          console.error("Error unsubscribing:", err);
        }
      };
    } catch (error) {
      console.error("Error subscribing to students:", error);
      setStudents([]);
    }
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
              onClick={() => downloadStudents(filtered)}
              disabled={filtered.length === 0}
              title="تنزيل ملف Excel"
            >
              <Download className="mr-2 h-4 w-4" />
              تنزيل Excel
            </Button>
            {role !== "accountant" && (
              <Link href="/students/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </Link>
            )}
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
