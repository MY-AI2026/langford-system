"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Settings2, Database } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title={t("settings")}
          description={t("settingsDescription")}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/settings/users">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">{t("userManagement")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("userManagementDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{t("systemSettings")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("systemSettingsDescription")}
              </p>
              <Badge className="mt-2" variant="secondary">{t("comingSoon")}</Badge>
            </CardContent>
          </Card>

          <Link href="/settings/export">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-50 p-2 dark:bg-green-500/10">
                    <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-base">{t("dataExport")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("dataExportDescription")}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </RoleGate>
  );
}
