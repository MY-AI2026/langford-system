"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Enrollment } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Printer, X } from "lucide-react";
import Image from "next/image";

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentCivilId?: string;
  enrollment: Enrollment;
}

function generateCertificateNumber(enrollmentId: string): string {
  const datePart = new Date().getFullYear().toString();
  const idPart = enrollmentId.slice(-6).toUpperCase();
  return `LANG-${datePart}-${idPart}`;
}

export function CertificateDialog({
  open,
  onOpenChange,
  studentName,
  studentCivilId,
  enrollment,
}: CertificateDialogProps) {
  const certNumber = generateCertificateNumber(enrollment.id);
  const completionDate = enrollment.endDate
    ? formatDate(enrollment.endDate)
    : formatDate(enrollment.updatedAt);

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const logoUrl = `${window.location.origin}/logo.png`;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate - ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: landscape; margin: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .certificate {
      width: 800px;
      min-height: 560px;
      border: 3px solid #1a1a1a;
      padding: 12px;
      position: relative;
      background: #fff;
    }
    .certificate-inner {
      border: 2px solid #C9A84C;
      padding: 40px 50px;
      min-height: 530px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
    }
    .corner-decoration {
      position: absolute;
      width: 40px;
      height: 40px;
      border-color: #C9A84C;
    }
    .corner-tl { top: 8px; left: 8px; border-top: 3px solid; border-left: 3px solid; }
    .corner-tr { top: 8px; right: 8px; border-top: 3px solid; border-right: 3px solid; }
    .corner-bl { bottom: 8px; left: 8px; border-bottom: 3px solid; border-left: 3px solid; }
    .corner-br { bottom: 8px; right: 8px; border-bottom: 3px solid; border-right: 3px solid; }
    .logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
    .institute-name {
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #E31E24;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .institute-sub {
      font-size: 11px;
      color: #666;
      margin-bottom: 20px;
    }
    .cert-title {
      font-size: 32px;
      font-weight: bold;
      color: #1a1a1a;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .cert-subtitle {
      font-size: 14px;
      color: #888;
      margin-bottom: 20px;
    }
    .cert-label {
      font-size: 13px;
      color: #888;
      margin-bottom: 6px;
    }
    .student-name {
      font-size: 36px;
      font-weight: bold;
      color: #1a1a1a;
      font-style: italic;
      border-bottom: 2px solid #C9A84C;
      padding-bottom: 6px;
      margin-bottom: 20px;
      display: inline-block;
    }
    .course-label {
      font-size: 13px;
      color: #888;
      margin-bottom: 4px;
    }
    .course-name {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-bottom: 20px;
    }
    .completion-date {
      font-size: 13px;
      color: #555;
      margin-bottom: 24px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: auto;
      padding-top: 20px;
    }
    .footer-col {
      text-align: center;
      font-size: 11px;
      color: #888;
    }
    .footer-col .line {
      width: 150px;
      border-top: 1px solid #ccc;
      margin: 0 auto 4px;
    }
    .cert-number {
      font-size: 10px;
      color: #aaa;
      position: absolute;
      bottom: 14px;
      right: 20px;
    }
    @media print {
      body { padding: 0; }
      .certificate { border: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="certificate-inner">
      <div class="corner-decoration corner-tl"></div>
      <div class="corner-decoration corner-tr"></div>
      <div class="corner-decoration corner-bl"></div>
      <div class="corner-decoration corner-br"></div>

      <img src="${logoUrl}" class="logo" alt="Langford Logo" crossorigin="anonymous" />
      <div class="institute-name">Langford</div>
      <div class="institute-sub">International Language Institute &mdash; Kuwait</div>

      <div class="cert-title">Certificate of Completion</div>
      <div class="cert-subtitle">This is to certify that</div>

      <div class="student-name">${studentName}</div>

      <div class="course-label">has successfully completed the course</div>
      <div class="course-name">${enrollment.courseName}</div>

      ${studentCivilId
        ? `<div style="font-size:12px;color:#666;margin-bottom:6px;">Civil ID: ${studentCivilId}</div>`
        : ""}
      <div class="completion-date">Completed on ${completionDate}</div>

      <div class="footer-row">
        <div class="footer-col">
          <div class="line"></div>
          Director
        </div>
        <div class="footer-col">
          <div class="line"></div>
          Instructor
        </div>
      </div>

      <div class="cert-number">Certificate No: ${certNumber}</div>
    </div>
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Certificate of Completion</DialogTitle>
        </DialogHeader>

        {/* Certificate Preview */}
        <div className="rounded-lg border bg-white p-6 text-center space-y-3">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Langford Logo" width={60} height={60} className="object-contain" />
          </div>
          <p className="font-black text-sm tracking-[4px] text-[#E31E24] uppercase">
            Langford
          </p>
          <p className="text-[10px] text-muted-foreground">
            International Language Institute — Kuwait
          </p>

          <div className="border-t border-b border-dashed py-3 my-2">
            <p className="text-lg font-bold tracking-widest uppercase">
              Certificate of Completion
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This is to certify that
            </p>
          </div>

          <p className="text-2xl font-bold italic border-b-2 border-[#C9A84C] inline-block pb-1">
            {studentName}
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            has successfully completed the course
          </p>
          <p className="text-base font-bold">{enrollment.courseName}</p>

          {studentCivilId && (
            <p className="text-xs text-muted-foreground">
              Civil ID: {studentCivilId}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Completed on {completionDate}
          </p>

          <p className="text-[10px] text-muted-foreground pt-2">
            Certificate No: {certNumber}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Certificate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
