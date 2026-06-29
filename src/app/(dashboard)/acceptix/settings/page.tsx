"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { RoleGate } from "@/components/auth/role-gate";
import {
  getEmailSettings,
  saveEmailSettings,
  EMAIL_SETTINGS_DEFAULTS,
} from "@/lib/services/reg-settings-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Loader2, Mail } from "lucide-react";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function SettingsContent() {
  const { t } = useLanguage();
  const { firebaseUser } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getEmailSettings();
        setEnabled(s.enabled);
        setRecipients(s.recipients);
        setFrom(s.from);
        setReplyTo(s.replyTo);
      } catch (e) {
        console.error("[settings] load failed:", e);
        toast.error(t("failedToLoadSettings"));
        setEnabled(EMAIL_SETTINGS_DEFAULTS.enabled);
        setRecipients(EMAIL_SETTINGS_DEFAULTS.recipients);
        setFrom(EMAIL_SETTINGS_DEFAULTS.from);
        setReplyTo(EMAIL_SETTINGS_DEFAULTS.replyTo);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addRecipient() {
    const e = newEmail.trim();
    if (!e) return;
    if (!isValidEmail(e)) {
      toast.error(t("invalidEmail"));
      return;
    }
    if (recipients.includes(e)) {
      toast.error(t("emailAlreadyInList"));
      return;
    }
    setRecipients([...recipients, e]);
    setNewEmail("");
  }

  function removeRecipient(email: string) {
    setRecipients(recipients.filter((r) => r !== email));
  }

  async function handleSave() {
    if (!firebaseUser) return;
    if (recipients.length === 0 && enabled) {
      toast.error(t("addRecipientOrDisable"));
      return;
    }
    if (replyTo && !isValidEmail(replyTo)) {
      toast.error(t("invalidReplyToEmail"));
      return;
    }
    setSaving(true);
    try {
      await saveEmailSettings(
        { enabled, recipients, from, replyTo },
        firebaseUser.uid
      );
      toast.success(t("settingsSaved"));
    } catch (e) {
      console.error("[settings] save failed:", e);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Settings className="h-6 w-6 text-primary" />
          {t("moduleSettings")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("moduleSettingsSubtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            {t("emailNotifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("enableNotifications")}</p>
              <p className="text-xs text-muted-foreground">
                {t("enableNotificationsDesc")}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>{t("recipients")}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@langfordkw.com"
                dir="ltr"
                className="text-left"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addRecipient}>
                <Plus className="ml-2 h-4 w-4" />
                {t("add")}
              </Button>
            </div>
            {recipients.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("noRecipientsYet")}
                ({EMAIL_SETTINGS_DEFAULTS.recipients.join(", ")}).
              </p>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                {recipients.map((r) => (
                  <div
                    key={r}
                    className="flex items-center justify-between rounded bg-muted/50 px-3 py-2"
                  >
                    <span dir="ltr" className="text-sm">
                      {r}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecipient(r)}
                      aria-label={`${t("remove")} ${r}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from">{t("fromSender")}</Label>
              <Input
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="Name <noreply@your-domain.com>"
              />
              <p className="text-xs text-muted-foreground">
                {t("domainVerifiedInResend")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyTo">{t("replyTo")}</Label>
              <Input
                id="replyTo"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="reply@langfordkw.com"
              />
            </div>
          </div>

          <div className="flex justify-start pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {t("saveSettings")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <SettingsContent />
    </RoleGate>
  );
}
