"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle } from "lucide-react";
import {
  WHATSAPP_TEMPLATES,
  buildWhatsAppLink,
  fillTemplate,
} from "@/lib/utils/whatsapp";

interface Props {
  phone: string;
  fullName: string;
  /** Optional extra placeholders for templates (e.g. courseName, amount) */
  context?: Record<string, string | number | undefined>;
  /** Visual style — icon button for tables, full button for detail pages */
  variant?: "icon" | "full";
}

/**
 * Opens a dialog where the sales rep picks a template, the placeholders
 * are pre-filled, and clicking "افتح واتساب" opens wa.me in a new tab.
 *
 * We never send anything automatically — the rep has to press Send in
 * WhatsApp themselves. This avoids automation concerns and keeps the
 * human in the loop.
 */
export function WhatsAppButton({ phone, fullName, context, variant = "icon" }: Props) {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(WHATSAPP_TEMPLATES[0]?.id ?? "");
  const [body, setBody] = useState("");

  function pickTemplate(id: string | null) {
    if (!id) return;
    setTemplateId(id);
    const tpl = WHATSAPP_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setBody(
      fillTemplate(tpl.body, {
        fullName,
        senderName: userData?.displayName ?? "",
        ...context,
      })
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !body) pickTemplate(templateId);
  }

  function send() {
    const link = buildWhatsAppLink(phone, body);
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenChange(true)}
          title={t("sendWhatsApp")}
          disabled={!phone}
        >
          <MessageCircle className="h-4 w-4 text-green-600" />
        </Button>
      ) : (
        <Button onClick={() => handleOpenChange(true)} disabled={!phone}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("sendWhatsAppTo")} {fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">{t("messageTemplate")}</Label>
              <Select value={templateId} onValueChange={pickTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">{t("messageText")}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                dir="rtl"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("whatsAppEditHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={send} disabled={!body.trim()}>
              {t("openWhatsApp")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
