"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student, StudentStatus } from "@/lib/types";
import { STUDENT_STATUS_CONFIG } from "@/lib/utils/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STATUS_ORDER: StudentStatus[] = [
  "lead",
  "contacted",
  "evaluated",
  "enrolled",
  "paid",
  "lost",
];

const STATUS_COLORS: Record<StudentStatus, string> = {
  lead: "#6b7280",
  contacted: "#3b82f6",
  evaluated: "#eab308",
  enrolled: "#22c55e",
  paid: "#059669",
  lost: "#ef4444",
};

interface PipelineFunnelProps {
  students: Student[];
}

export function PipelineFunnel({ students }: PipelineFunnelProps) {
  const data = STATUS_ORDER.map((status) => ({
    name: STUDENT_STATUS_CONFIG[status].label,
    count: students.filter((s) => s.status === status).length,
    status,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Student Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [value, "Students"]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
