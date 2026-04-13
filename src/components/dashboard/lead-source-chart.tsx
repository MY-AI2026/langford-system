"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#E31E24",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

interface LeadSourceChartProps {
  students: Student[];
}

export function LeadSourceChart({ students }: LeadSourceChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of students) {
      const src = s.leadSource || "Unknown";
      counts[src] = (counts[src] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${value} (${(((value as number) / students.length) * 100).toFixed(0)}%)`,
                name,
              ]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
