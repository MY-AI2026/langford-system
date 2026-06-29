"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils/format";
import { useLanguage } from "@/contexts/language-context";
import { Target } from "lucide-react";

interface MonthlyTargetProgressProps {
  current: number;
  target: number;
}

export function MonthlyTargetProgress({
  current,
  target,
}: MonthlyTargetProgressProps) {
  const { t } = useLanguage();
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{t("monthlyTarget")}</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">{formatCurrency(current)}</span>
          <span className="text-sm text-muted-foreground">
            {t("of")} {formatCurrency(target)}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {percentage.toFixed(0)}% {t("achieved")}
        </p>
      </CardContent>
    </Card>
  );
}
