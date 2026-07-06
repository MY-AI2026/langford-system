"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSpreadsheet, FileJson, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import {
  fetchAllCollections,
  bundleToExcel,
  bundleToJson,
  countRecords,
  EXPORTABLE_COLLECTIONS,
} from "@/lib/services/data-export-service";

export default function DataExportPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <DataExportContent />
    </RoleGate>
  );
}

function DataExportContent() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<null | "excel" | "json">(null);

  async function run(kind: "excel" | "json") {
    setBusy(kind);
    try {
      const bundle = await fetchAllCollections();
      const total = countRecords(bundle);
      if (kind === "excel") bundleToExcel(bundle);
      else bundleToJson(bundle);
      toast.success(t("exportDone").replace("{count}", String(total)));
    } catch (e) {
      console.error("[data-export] failed:", e);
      toast.error(t("exportFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("dataExport")} description={t("dataExportDescription")} />

      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("settings")}
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base">{t("exportExcelTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("exportExcelDesc")}</p>
            <Button onClick={() => run("excel")} disabled={busy !== null} className="w-full">
              {busy === "excel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {t("exportExcelBtn")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileJson className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">{t("exportJsonTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("exportJsonDesc")}</p>
            <Button
              onClick={() => run("json")}
              disabled={busy !== null}
              variant="outline"
              className="w-full"
            >
              {busy === "json" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              {t("exportJsonBtn")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t("exportIncludedTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EXPORTABLE_COLLECTIONS.map((name) => (
              <span
                key={name}
                className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("exportNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
