/**
 * Dependency-free schedule → PNG rendering for the Academic Organizer.
 *
 * We render a self-contained, INLINE-STYLED HTML card into an SVG
 * <foreignObject>, rasterize it onto a <canvas>, and export a PNG blob — no
 * html2canvas / dom-to-image dependency. Inline styles are used deliberately:
 * Tailwind classes wouldn't survive serialization into the SVG, but inline
 * styles do.
 *
 * The PNG is then shared over WhatsApp:
 *   - Mobile: the Web Share API (`navigator.share({ files })`) opens the native
 *     share sheet with the image + caption — the user picks WhatsApp.
 *   - Desktop (no file-share support): we download the PNG and open a wa.me
 *     deep link with the caption text (the user attaches the saved image).
 * wa.me links cannot carry an attachment, so this split is unavoidable.
 */

import { buildWhatsAppLink } from "@/lib/utils/whatsapp";

export interface ScheduleCardData {
  instituteName: string;
  studentName: string;
  level: string | null;
  className: string;
  instructorName: string;
  daysLabel: string;
  timeLabel: string;
  room: string;
}

const CARD_WIDTH = 640;
const CARD_HEIGHT = 420;

/** Escape text so it is safe inside XHTML (foreignObject is XML, not HTML). */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid #eee;">
    <span style="color:#6b7280;font-size:18px;">${esc(label)}</span>
    <span style="color:#111827;font-size:19px;font-weight:600;text-align:left;">${esc(value)}</span>
  </div>`;
}

/** Build the inline-styled HTML card (RTL, Arabic) for a single student. */
export function buildScheduleCardHtml(d: ScheduleCardData): string {
  return `<div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;box-sizing:border-box;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#ffffff;">
    <div style="background:#C8102E;color:#ffffff;padding:22px 28px;">
      <div style="font-size:24px;font-weight:700;">${esc(d.instituteName)}</div>
      <div style="font-size:15px;opacity:0.9;margin-top:2px;">جدول الدراسة الأسبوعي</div>
    </div>
    <div style="padding:24px 28px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:22px;font-weight:700;color:#111827;">${esc(d.studentName)}</div>
        ${
          d.level
            ? `<div style="background:#FEE2E2;color:#B91C1C;font-size:15px;font-weight:600;padding:5px 12px;border-radius:9999px;">${esc(
                d.level
              )}</div>`
            : ""
        }
      </div>
      ${row("المجموعة / المستوى", d.className)}
      ${row("المدرّس", d.instructorName)}
      ${row("الأيام", d.daysLabel)}
      ${row("الموعد", d.timeLabel)}
      ${d.room ? row("القاعة", d.room) : ""}
    </div>
    <div style="position:absolute;bottom:0;right:0;left:0;padding:14px 28px;color:#9ca3af;font-size:14px;">
      بالتوفيق في رحلتك التعليمية 🎓
    </div>
  </div>`;
}

/** Rasterize an inline-styled XHTML string into a PNG blob via SVG + canvas. */
export async function htmlToPngBlob(
  innerHtml: string,
  width: number = CARD_WIDTH,
  height: number = CARD_HEIGHT
): Promise<Blob> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${innerHtml}</foreignObject></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to rasterize schedule image"));
    img.src = url;
  });

  const scale = Math.min(window.devicePixelRatio || 1, 3) || 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Failed to export PNG");
  return blob;
}

/** Convenience: build + rasterize a student's schedule card to a PNG blob. */
export function renderScheduleCard(data: ScheduleCardData): Promise<Blob> {
  return htmlToPngBlob(buildScheduleCardHtml(data));
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

/**
 * Share a schedule PNG + caption to WhatsApp. Uses the native share sheet when
 * file-sharing is supported (mobile); otherwise downloads the image and opens
 * a wa.me deep link with the caption (desktop).
 */
export async function shareScheduleToWhatsApp(opts: {
  blob: Blob;
  fileName: string;
  phone: string;
  message: string;
}): Promise<ShareOutcome> {
  const { blob, fileName, phone, message } = opts;
  const file = new File([blob], fileName, { type: "image/png" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: message });
      return "shared";
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return "cancelled";
      // fall through to the download fallback on any other error
    }
  }

  // Desktop fallback — download the PNG, then open WhatsApp with the caption.
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  window.open(buildWhatsAppLink(phone, message), "_blank");
  return "downloaded";
}
