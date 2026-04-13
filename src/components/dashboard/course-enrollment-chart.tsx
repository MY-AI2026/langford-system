"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student, Course } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

interface CourseEnrollmentChartProps {
  students: Student[];
  courses: Course[];
}

export function CourseEnrollmentChart({
  students,
  courses,
}: CourseEnrollmentChartProps) {
  const data = useMemo(() => {
    // Count students interested in each course
    const counts: Record<string, number> = {};
    for (const s of students) {
      const course = s.interestedCourse;
      if (course) {
        counts[course] = (counts[course] || 0) + 1;
      }
    }

    // Also include active courses with zero students
    for (const c of courses) {
      if (c.isActive && !counts[c.name]) {
        counts[c.name] = 0;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 courses
  }, [students, courses]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Students by Course Interest</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [value, "Students"]}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
