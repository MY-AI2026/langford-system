"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { subscribeToStudents } from "@/lib/services/student-service";
import { getAllUsers } from "@/lib/services/user-service";
import { Student, User } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import { STUDENT_STATUS_CONFIG, DEFAULT_LEAD_SOURCES } from "@/lib/utils/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = ["#E31E24", "#1a1a1a", "#666666", "#999999", "#cccccc", "#E31E24", "#333333"];

export default function ReportsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGate>
  );
}

function ReportsContent() {
  const { role, firebaseUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!firebaseUser || !role) return;
    const unsub = subscribeToStudents(
      { role: "admin", userId: firebaseUser.uid },
      setStudents
    );
    getAllUsers().then(setUsers);
    return () => unsub();
  }, [firebaseUser, role]);

  // Sales performance data
  const salesPerformance = users
    .filter((u) => u.role === "sales")
    .map((user) => {
      const userStudents = students.filter(
        (s) => s.assignedSalesRepId === user.uid
      );
      const enrolled = userStudents.filter(
        (s) => s.status === "enrolled" || s.status === "paid"
      ).length;
      const revenue = userStudents.reduce(
        (sum, s) => sum + (s.paymentSummary?.amountPaid || 0),
        0
      );
      return {
        name: user.displayName,
        students: userStudents.length,
        enrolled,
        conversion: userStudents.length > 0
          ? ((enrolled / userStudents.length) * 100).toFixed(1)
          : "0",
        revenue,
        target: user.monthlyTarget,
      };
    });

  // Lead source data
  const leadSourceData = DEFAULT_LEAD_SOURCES.map((source) => {
    const sourceStudents = students.filter((s) => s.leadSource === source);
    const enrolled = sourceStudents.filter(
      (s) => s.status === "enrolled" || s.status === "paid"
    ).length;
    return {
      name: source,
      count: sourceStudents.length,
      enrolled,
      conversion: sourceStudents.length > 0
        ? ((enrolled / sourceStudents.length) * 100).toFixed(1)
        : "0",
    };
  }).filter((d) => d.count > 0);

  // Status distribution
  const statusData = Object.entries(STUDENT_STATUS_CONFIG).map(([status, config]) => ({
    name: config.label,
    value: students.filter((s) => s.status === status).length,
  })).filter((d) => d.value > 0);

  function exportCSV() {
    const headers = ["Name", "Phone", "Status", "Lead Source", "Sales Rep", "Total Fees", "Paid", "Remaining"];
    const rows = students.map((s) => [
      s.fullName,
      s.phone,
      s.status,
      s.leadSource,
      s.assignedSalesRepName,
      (s.paymentSummary?.totalFees || 0),
      (s.paymentSummary?.amountPaid || 0),
      (s.paymentSummary?.remainingBalance || 0),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `langford-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="System-wide performance and financial reports"
        action={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Source Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadSourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1a1a1a" name="Total" />
                <Bar dataKey="enrolled" fill="#E31E24" name="Enrolled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Total Students</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPerformance.map((rep) => (
                  <TableRow key={rep.name}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.students}</TableCell>
                    <TableCell>{rep.enrolled}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rep.conversion}%</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(rep.revenue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(rep.target)}
                    </TableCell>
                  </TableRow>
                ))}
                {salesPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sales users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
