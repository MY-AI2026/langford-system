"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
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
        toast.error("فشل تحميل الإعدادات — هنستخدم الافتراضيات");
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
      toast.error("الإيميل مش صحيح");
      return;
    }
    if (recipients.includes(e)) {
      toast.error("الإيميل ده موجود بالفعل");
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
      toast.error("لازم تضيف إيميل واحد على الأقل أو تعطّل الإشعارات");
      return;
    }
    if (replyTo && !isValidEmail(replyTo)) {
      toast.error("إيميل الـ reply-to مش صحيح");
      return;
    }
    setSaving(true);
    try {
      await saveEmailSettings(
        { enabled, recipients, from, replyTo },
        firebaseUser.uid
      );
      toast.success("تم حفظ الإعدادات");
    } catch (e) {
      console.error("[settings] save failed:", e);
      toast.error("فشل الحفظ");
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
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Settings className="h-6 w-6 text-primary" />
          إعدادات الموديول
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة إشعارات الإيميل لتسجيل الطلبة الجدد.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            إشعارات البريد الإلكتروني
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">تفعيل الإشعارات</p>
              <p className="text-xs text-muted-foreground">
                لو معطّل، الـ Cloud Function هتـ skip إرسال الإيميل لكن
                الـ in-app notification هتفضل تشتغل عادي.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>المستلمين</Label>
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
                إضافة
              </Button>
            </div>
            {recipients.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                لسه مفيش إيميلات — لو فعّلت الإشعارات هيستخدم الـ default
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
                      aria-label={`إزالة ${r}`}
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
              <Label htmlFor="from">من (From)</Label>
              <Input
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                dir="ltr"
                className="text-left"
                placeholder="Name <noreply@your-domain.com>"
              />
              <p className="text-xs text-muted-foreground">
                لازم الـ domain يكون متحقّق منه في Resend.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyTo">رد إلى (Reply-To)</Label>
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
              حفظ الإعدادات
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
