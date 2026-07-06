"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/components/auth/role-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import {
  getSystemSettings,
  saveSystemSettings,
  SYSTEM_SETTINGS_DEFAULTS,
  SystemSettings,
} from "@/lib/services/system-settings-service";

export default function SystemSettingsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <SystemSettingsContent />
    </RoleGate>
  );
}

function SystemSettingsContent() {
  const { t } = useLanguage();
  const { firebaseUser } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(SYSTEM_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSystemSettings()
      .then((s) => {
        if (active) setSettings(s);
      })
      .catch((e) => console.error("[system-settings] load failed:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await saveSystemSettings(settings, firebaseUser.uid);
      toast.success(t("settingsSaved"));
    } catch (e) {
      console.error("[system-settings] save failed:", e);
      toast.error(t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("systemSettings")} description={t("systemSettingsDescription")} />

      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("settings")}
      </Link>

      {/* Institute info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("instituteInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="instituteName">{t("instituteNameEn")}</Label>
            <Input
              id="instituteName"
              value={settings.instituteName}
              onChange={(e) => set("instituteName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instituteNameAr">{t("instituteNameAr")}</Label>
            <Input
              id="instituteNameAr"
              value={settings.instituteNameAr}
              onChange={(e) => set("instituteNameAr", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t("address")}</Label>
            <Input
              id="address"
              value={settings.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acceptix commission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("acceptixCommission")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("commissionRateHint")}</p>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="commissionRate">{t("commissionRatePct")}</Label>
            <div className="relative">
              <Input
                id="commissionRate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={Math.round(settings.commissionRate * 1000) / 10}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  const frac = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) / 100 : 0;
                  set("commissionRate", frac);
                }}
                className="pe-8"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditableList
          title={t("leadSources")}
          hint={t("leadSourcesHint")}
          items={settings.leadSources}
          onChange={(items) => set("leadSources", items)}
          addLabel={t("addItem")}
        />
        <EditableList
          title={t("levels")}
          hint={t("levelsHint")}
          items={settings.levels}
          onChange={(items) => set("levels", items)}
          addLabel={t("addItem")}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}

function EditableList({
  title,
  hint,
  items,
  onChange,
  addLabel,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`remove ${item}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={addLabel}
          />
          <Button type="button" variant="outline" onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
