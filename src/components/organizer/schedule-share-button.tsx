"use client";

import { useState } from "react";
import { ScheduleEntryStudent } from "@/lib/types";
import {
  renderScheduleCard,
  shareScheduleToWhatsApp,
} from "@/lib/organizer/schedule-image";
import { buildScheduleMessage } from "@/lib/organizer/whatsapp-schedule";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export interface ShareClassData {
  instituteName: string;
  className: string;
  instructorName: string;
  daysLabel: string;
  timeLabel: string;
  room: string;
}

interface ScheduleShareButtonProps {
  student: ScheduleEntryStudent;
  classData: ShareClassData;
}

export function ScheduleShareButton({ student, classData }: ScheduleShareButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (!student.phone) {
      toast.error("الطالب ده مالوش رقم تليفون");
      return;
    }
    setBusy(true);
    try {
      const blob = await renderScheduleCard({
        instituteName: classData.instituteName,
        studentName: student.studentName,
        level: student.level,
        className: classData.className,
        instructorName: classData.instructorName,
        daysLabel: classData.daysLabel,
        timeLabel: classData.timeLabel,
        room: classData.room,
      });
      const message = buildScheduleMessage({
        instituteName: classData.instituteName,
        studentName: student.studentName,
        className: classData.className,
        instructorName: classData.instructorName,
        daysLabel: classData.daysLabel,
        timeLabel: classData.timeLabel,
        room: classData.room,
        level: student.level,
      });
      const fileName = `schedule-${student.studentName.replace(/\s+/g, "-")}.png`;
      const outcome = await shareScheduleToWhatsApp({
        blob,
        fileName,
        phone: student.phone,
        message,
      });
      if (outcome === "shared") toast.success("تمت المشاركة ✅");
      else if (outcome === "downloaded")
        toast.success("نزّلنا الصورة وفتحنا واتساب — ارفق الصورة وابعت 📎");
    } catch (err) {
      console.error("[schedule-share] failed:", err);
      toast.error("تعذّر تجهيز صورة الجدول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40"
      onClick={handleShare}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="ms-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <MessageCircle className="ms-1.5 h-3.5 w-3.5" />
      )}
      واتساب
    </Button>
  );
}
