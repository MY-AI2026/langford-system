"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils/format";
import { Student, User } from "@/lib/types";
import { Trophy } from "lucide-react";

interface SalesLeaderboardProps {
  students: Student[];
  salesUsers: User[];
}

export function SalesLeaderboard({ students, salesUsers }: SalesLeaderboardProps) {
  const leaderboard = salesUsers
    .map((user) => {
      const mine = students.filter((s) => s.assignedSalesRepId === user.uid);
      const enrolled = mine.filter(
        (s) => s.status === "enrolled" || s.status === "paid"
      ).length;
      const revenue = mine.reduce(
        (sum, s) => sum + (s.paymentSummary?.amountPaid ?? 0),
        0
      );
      const targetPct =
        user.monthlyTarget > 0
          ? Math.min(100, (revenue / user.monthlyTarget) * 100)
          : 0;
      return { user, total: mine.length, enrolled, revenue, targetPct };
    })
    .sort((a, b) => b.revenue - a.revenue);

  if (leaderboard.length === 0) return null;

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Sales Performance</CardTitle>
        <Trophy className="h-4 w-4 text-yellow-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map(({ user, total, enrolled, revenue, targetPct }, idx) => (
            <div key={user.uid} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold w-5 text-center ${
                      medalColors[idx] ?? "text-muted-foreground"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium leading-tight">
                      {user.displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {enrolled}/{total} enrolled
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(revenue)}</p>
                  {user.monthlyTarget > 0 && (
                    <p className="text-xs text-muted-foreground">
                      of {formatCurrency(user.monthlyTarget)}
                    </p>
                  )}
                </div>
              </div>
              {user.monthlyTarget > 0 && (
                <div className="flex items-center gap-2">
                  <Progress value={targetPct} className="h-1.5" />
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                    {targetPct.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
