/**
 * WhatsApp message templates for sales / customer follow-up.
 *
 * Templates use `{{placeholder}}` substitution.
 * Output is a wa.me deep link — opens the user's WhatsApp (web or app) with
 * the message prefilled. The sales rep still has to hit "send" — we never
 * send messages without explicit user action.
 */

import { normalizePhone } from "./phone";

export interface WhatsAppTemplate {
  id: string;
  label: string;
  /** Use {{fullName}}, {{instituteName}}, {{amount}}, etc. */
  body: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "intro",
    label: "ترحيب أولي",
    body: `أهلاً {{fullName}} 👋
معاك {{senderName}} من معهد لانجفورد.
سعدت إنك سألت عن دوراتنا. ممكن نحدد ميعاد مكالمة قصيرة نتعرف على هدفك في تعلم الإنجليزي؟`,
  },
  {
    id: "followup",
    label: "متابعة بعد المكالمة",
    body: `أهلاً {{fullName}} 🌷
سعدنا بالحديث معاك. أبعتلك تفاصيل الدورة اللي اخترناها وسعرها. أي استفسار أنا تحت أمرك.`,
  },
  {
    id: "evaluation",
    label: "موعد اختبار تحديد المستوى",
    body: `أهلاً {{fullName}} 📝
بنذكرك بموعد اختبار تحديد المستوى يوم {{date}} في تمام {{time}} بمعهد لانجفورد. لو حابب تغيّر الميعاد قولنا.`,
  },
  {
    id: "payment_reminder",
    label: "تذكير بدفعة مستحقة",
    body: `أهلاً {{fullName}} 🌷
بنذكرك بقسط مستحق بقيمة {{amount}} د.ك. تقدر تدفع في المعهد أو نرسلك تفاصيل التحويل البنكي. شكراً لك.`,
  },
  {
    id: "course_start",
    label: "بداية الدورة",
    body: `أهلاً {{fullName}} 🎓
دورة {{courseName}} هتبدأ يوم {{date}}. بنتمنالك التوفيق وأي استفسار أنا هنا.`,
  },
  {
    id: "summer_club_intro",
    label: "النادي الصيفي — ترحيب",
    body: `أهلاً {{fullName}} ☀️
شكراً لاهتمامك بالنادي الصيفي للأطفال في معهد لانجفورد! ابعتلنا اسم وسن طفلك ونرتب معاك مقابلة سريعة.`,
  },
];

/** Substitute {{key}} occurrences from the data map. */
export function fillTemplate(
  body: string,
  data: Record<string, string | number | undefined>
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    return v === undefined || v === null ? `{{${key}}}` : String(v);
  });
}

/** Build a wa.me deep link with the prefilled message. */
export function buildWhatsAppLink(phone: string, message: string): string {
  // wa.me expects digits only, country code included. Kuwait = 965.
  const digits = normalizePhone(phone);
  const fullNumber = digits.length === 8 ? `965${digits}` : digits;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}
