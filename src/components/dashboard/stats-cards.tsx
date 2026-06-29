"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  DollarSign,
  Clock,
  TrendingUp,
  FileCheck,
  TrendingDown,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/contexts/language-context";

interface Trend {
  value: number;
  positive: boolean;
}

interface StatsCardsProps {
  totalStudents: number;
  totalRevenue: number;
  pendingPayments: number;
  conversionRate: number;
  ieltsRevenue: number;
  ieltsBookingsCount: number;
  embassyPaid: number;
  /** Optional month-over-month deltas, attached to the matching cards. */
  studentsTrend?: Trend;
  revenueTrend?: Trend;
  ieltsTrend?: Trend;
}

/** Tone → token-aware classes that stay legible in both light and dark mode
 * (the old bg-*-50 fills were nearly invisible on a dark canvas). */
const TONES: Record<string, { icon: string; bg: string }> = {
  blue: { icon: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  green: { icon: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  purple: { icon: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  orange: { icon: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  emerald: { icon: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  red: { icon: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  yellow: { icon: "text-yellow-600 dark:text-yellow-500", bg: "bg-yellow-500/10" },
};

interface StatItem {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  /** Optional month-over-month delta, e.g. { value: 12.5, positive: true }. */
  trend?: { value: number; positive: boolean };
}

export function StatsCards({
  totalStudents,
  totalRevenue,
  pendingPayments,
  conversionRate,
  ieltsRevenue,
  ieltsBookingsCount,
  embassyPaid,
  studentsTrend,
  revenueTrend,
  ieltsTrend,
}: StatsCardsProps) {
  const { t } = useLanguage();
  const netIelts = ieltsRevenue - embassyPaid;
  const stats: StatItem[] = [
    {
      title: t("totalStudents"),
      value: totalStudents.toString(),
      icon: GraduationCap,
      tone: "blue",
      trend: studentsTrend,
    },
    {
      title: t("totalRevenue"),
      value: formatCurrency(totalRevenue),
      subtitle: t("courseFeesOnly"),
      icon: DollarSign,
      tone: "green",
      trend: revenueTrend,
    },
    {
      title: t("ieltsBookings"),
      value: formatCurrency(ieltsRevenue),
      subtitle: `${ieltsBookingsCount} ${ieltsBookingsCount !== 1 ? t("bookings") : t("booking")}`,
      icon: FileCheck,
      tone: "purple",
      trend: ieltsTrend,
    },
    {
      title: t("paidToEmbassy"),
      value: formatCurrency(embassyPaid),
      subtitle: t("ieltsTransfers"),
      icon: TrendingDown,
      tone: "orange",
    },
    {
      title: t("netIelts"),
      value: formatCurrency(netIelts),
      subtitle: t("bookingsMinusEmbassy"),
      icon: Calculator,
      tone: netIelts >= 0 ? "emerald" : "red",
    },
    {
      title: t("pendingPayments"),
      value: formatCurrency(pendingPayments),
      icon: Clock,
      tone: "yellow",
    },
    {
      title: t("conversionRate"),
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      tone: "red",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const tone = TONES[stat.tone];
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${tone.bg} transition-transform duration-200 group-hover/card:scale-110`}
              >
                <stat.icon className={`h-4 w-4 ${tone.icon}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2">
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                {stat.trend && (
                  <span
                    className={`mb-1 inline-flex items-center gap-0.5 text-xs font-medium ${
                      stat.trend.positive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {stat.trend.positive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(stat.trend.value).toFixed(1)}%
                  </span>
                )}
              </div>
              {stat.subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
