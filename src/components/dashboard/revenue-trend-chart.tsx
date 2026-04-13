"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface RevenueTrendChartProps {
  students: Student[];
}

export function RevenueTrendChart({ students }: RevenueTrendChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });

      let revenue = 0;
      for (const s of students) {
        try {
          const created = s.createdAt?.toDate?.() ?? (typeof s.createdAt === "string" ? new Date(s.createdAt as unknown as string) : null);
          if (created && created >= d && created < nextMonth) {
            revenue += s.paymentSummary?.amountPaid ?? 0;
          }
        } catch {
          /* skip */
        }
      }

      months.push({ key, label, revenue });
    }

    return months;
  }, [students]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ left: 10, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
              }
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value as number), "Revenue"]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
