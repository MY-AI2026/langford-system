"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

/**
 * Placeholder — the full reporting surface (date-range picker, group by
 * agent / course, commission summary, Excel + PDF export) lands in PR #4.
 * Until then the page renders a friendly "coming soon" stub so the nav
 * link doesn't 404.
 */
function ReportsContent() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <FileBarChart className="h-6 w-6 text-primary" />
          التقارير
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تقارير الأداء الشهرية وتصدير العمولات.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileBarChart className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-base font-semibold">قريباً</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            هنبني هنا تقرير شهري مفصل، مع تجميع حسب الموظف والكورس، وحساب
            العمولات (10%)، وتصدير PDF و Excel جاهز يتبعت لـ Acceptix.
            بيشحن في PR رقم 4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGate>
  );
}
