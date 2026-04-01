"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, DollarSign, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface StatsCardsProps {
  totalStudents: number;
  totalRevenue: number;
  pendingPayments: number;
  conversionRate: number;
}

export function StatsCards({
  totalStudents,
  totalRevenue,
  pendingPayments,
  conversionRate,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Students",
      value: totalStudents.toString(),
      icon: GraduationCap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Payments",
      value: formatCurrency(pendingPayments),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-langford-red",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
