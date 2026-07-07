/**
 * Builds the friendly Arabic WhatsApp caption that accompanies a student's
 * schedule image. Kept separate from the generic sales templates in
 * `utils/whatsapp.ts` because the schedule message is composed from live
 * class data (days/time/instructor) rather than a fixed placeholder template.
 */

export interface ScheduleMessageData {
  instituteName: string;
  studentName: string;
  className: string;
  instructorName: string;
  daysLabel: string;
  timeLabel: string;
  room: string;
  level: string | null;
}

export function buildScheduleMessage(d: ScheduleMessageData): string {
  const lines = [
    `أهلاً ${d.studentName} 🌟`,
    `مبروك انضمامك لمعهد ${d.instituteName}! ده جدولك الأسبوعي:`,
    "",
    `📚 المجموعة: ${d.className}${d.level ? ` (${d.level})` : ""}`,
    `👨‍🏫 المدرّس: ${d.instructorName}`,
    `🗓️ الأيام: ${d.daysLabel}`,
    `⏰ الموعد: ${d.timeLabel}`,
  ];
  if (d.room) lines.push(`📍 القاعة: ${d.room}`);
  lines.push("", "الصورة المرفقة فيها التفاصيل كاملة. أي استفسار إحنا تحت أمرك 🙌");
  return lines.join("\n");
}
