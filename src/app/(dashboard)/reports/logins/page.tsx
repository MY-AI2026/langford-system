"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { subscribeToLoginLogs } from "@/lib/services/user-service";
import { formatDateTime } from "@/lib/utils/format";
import { Timestamp } from "firebase/firestore";
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
import { LogIn, Users } from "lucide-react";

interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  email: string;
  loginAt: Timestamp;
}

export default function LoginReportPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <LoginReportContent />
    </RoleGate>
  );
}

function LoginReportContent() {
  const [logs, setLogs] = useState<LoginLog[]>([]);

  useEffect(() => {
    const unsub = subscribeToLoginLogs(setLogs);
    return () => unsub();
  }, []);

  // Count unique users today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogins = logs.filter(
    (l) => l.loginAt.toDate() >= today
  );
  const uniqueTodayUsers = new Set(todayLogins.map((l) => l.userId)).size;

  // Count logins this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogins = logs.filter(
    (l) => l.loginAt.toDate() >= weekAgo
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login Activity Report"
        description="Track all user login activity"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Logins
            </CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Today&apos;s Logins
            </CardTitle>
            <LogIn className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayLogins.length}</p>
            <p className="text-xs text-muted-foreground">
              {uniqueTodayUsers} unique user(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              This Week
            </CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{weekLogins.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Login Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.userName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {log.email}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {formatDateTime(log.loginAt)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  No login activity recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
