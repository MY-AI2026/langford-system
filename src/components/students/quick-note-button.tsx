"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickyNote, Loader2 } from "lucide-react";
import { addActivityLogEntry } from "@/lib/services/student-service";
import { toast } from "sonner";

interface Props {
  studentId: string;
  studentName: string;
  variant?: "icon" | "full";
}

/**
 * Inline button + dialog to add a note or follow-up against a student
 * WITHOUT navigating to the student's detail page. Saves a click for sales
 * reps who triage a long list of leads.
 */
export function QuickNoteButton({ studentId, studentName, variant = "icon" }: Props) {
  const { firebaseUser, userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"note" | "follow_up">("note");
  const [description, setDescription] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setType("note");
    setDescription("");
    setFollowUpDate("");
  }

  async function save() {
    if (!firebaseUser || !userData) {
      toast.error("الجلسة انتهت — اعمل تسجيل دخول تاني");
      return;
    }
    if (!description.trim()) {
      toast.error("اكتب الملاحظة الأول");
      return;
    }
    if (type === "follow_up" && !followUpDate) {
      toast.error("اختار تاريخ المتابعة");
      return;
    }
    setSaving(true);
    try {
      await addActivityLogEntry(studentId, {
        type,
        description: description.trim(),
        createdBy: firebaseUser.uid,
        createdByName: userData.displayName,
        followUpDate: type === "follow_up" ? new Date(followUpDate) : null,
      });
      toast.success("تم حفظ الملاحظة");
      setOpen(false);
      reset();
    } catch (err) {
      console.error("[QuickNoteButton] save failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`فشل حفظ الملاحظة: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          title="إضافة ملاحظة"
        >
          <StickyNote className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <StickyNote className="mr-2 h-4 w-4" />
          ملاحظة سريعة
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ملاحظة لـ {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">النوع</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">ملاحظة</SelectItem>
                  <SelectItem value="follow_up">متابعة (Follow-up)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "follow_up" && (
              <div>
                <Label className="mb-1 block">تاريخ المتابعة</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            )}
            <div>
              <Label className="mb-1 block">النص</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="اكتب الملاحظة..."
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
