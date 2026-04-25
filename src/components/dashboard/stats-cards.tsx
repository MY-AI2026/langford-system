"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, DollarSign, Clock, TrendingUp, FileCheck, TrendingDown, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface StatsCardsProps {
  totalStudents: number;
  totalRevenue: number;
  pendingPayments: number;
  conversionRate: number;
  ieltsRevenue: number;
  ieltsBookingsCount: number;
  embassyPaid: number;
}

export function StatsCards({
  totalStudents,
  totalRevenue,
  pendingPayments,
  conversionRate,
  ieltsRevenue,
  ieltsBookingsCount,
  embassyPaid,
}: StatsCardsProps) {
  const netIelts = ieltsRevenue - embassyPaid;
  const stats = [
    {
      title: "Total Students",
      value: totalStudents.toString(),
      icon: GraduationCap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "إجمالي الدخل المحصل",
      value: formatCurrency(totalRevenue),
      subtitle: "المدفوع فعلياً",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "IELTS Bookings",
      value: formatCurrency(ieltsRevenue),
      subtitle: `${ieltsBookingsCount} booking${ieltsBookingsCount !== 1 ? "s" : ""}`,
      icon: FileCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Paid to Embassy",
      value: formatCurrency(embassyPaid),
      subtitle: "IELTS transfers",
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Net IELTS",
      value: formatCurrency(netIelts),
      subtitle: "Bookings − Embassy",
      icon: Calculator,
      color: netIelts >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "المبالغ غير المحصلة",
      value: formatCurrency(pendingPayments),
      subtitle: "متبقي + أقساط لم تدفع",
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
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
