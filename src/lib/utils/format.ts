import { Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";

type AnyDate = Timestamp | Date | string | null | undefined;

function toDate(date: AnyDate): Date | null {
  if (!date) return null;
  if (typeof date === "string") return new Date(date);
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
  // Fake Timestamp-like object with toDate()
  if (typeof (date as { toDate?: () => Date }).toDate === "function") {
    return (date as { toDate: () => Date }).toDate();
  }
  return null;
}

export function formatDate(date: AnyDate): string {
  const d = toDate(date);
  if (!d) return "N/A";
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: AnyDate): string {
  const d = toDate(date);
  if (!d) return "N/A";
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(date: AnyDate): string {
  const d = toDate(date);
  if (!d) return "N/A";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatCurrency(amount: number, currency = "KWD"): string {
  return new Intl.NumberFormat("en-KW", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "KWD" ? 3 : 2,
  }).format(amount);
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return phone;
}

export function isOverdue(date: AnyDate): boolean {
  const d = toDate(date);
  if (!d) return false;
  return isBefore(d, new Date());
}

export function isUpcoming(date: AnyDate, daysAhead = 3): boolean {
  const d = toDate(date);
  if (!d) return false;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  return isAfter(d, new Date()) && isBefore(d, futureDate);
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const yearMonth = format(now, "yyyyMM");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `LNG-${yearMonth}-${random}`;
}
