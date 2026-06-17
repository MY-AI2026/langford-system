"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseWorkbookRows, pickColumn } from "@/lib/utils/excel";
import { isLikelyValidPhone } from "@/lib/utils/phone";
import { createStudent } from "@/lib/services/student-service";
import { getSalesUsers } from "@/lib/services/user-service";
import { User, UserRole } from "@/lib/types";

// Header aliases — match both our own Arabic export headers and common English ones.
const NAME_ALIASES = ["الاسم", "اسم الطالب", "name", "student name", "full name"];
const PHONE_ALIASES = ["التليفون", "رقم التليفون", "الموبايل", "phone", "mobile", "tel", "telephone"];
const EMAIL_ALIASES = ["البريد", "الايميل", "البريد الالكتروني", "email", "e-mail"];
const SOURCE_ALIASES = ["المصدر", "source", "lead source"];

interface StagedRow {
  rowNumber: number; // 1-based, matching the spreadsheet (header = row 1)
  fullName: string;
  phone: string;
  email: string;
  leadSource: string;
  valid: boolean;
  reason?: string;
}

interface ImportResult {
  created: number;
  skipped: { row: number; name: string; reason: string }[];
}

export function StudentImportDialog({
  currentUser,
  role,
  onImported,
}: {
  currentUser: { uid: string; displayName: string };
  role: UserRole;
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sales rep assignment: admin/coordinator can choose; sales imports to self.
  const canChooseRep = role === "admin" || role === "coordinator";
  const [salesReps, setSalesReps] = useState<User[]>([]);
  const [assignTo, setAssignTo] = useState<string>(currentUser.uid);

  const validRows = rows.filter((r) => r.valid);

  function reset() {
    setRows([]);
    setFileName("");
    setProgress(0);
    setResult(null);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseWorkbookRows(file);
      const seenPhones = new Set<string>();
      const staged: StagedRow[] = parsed.map((row, i) => {
        const fullName = pickColumn(row, NAME_ALIASES);
        const phone = pickColumn(row, PHONE_ALIASES);
        const email = pickColumn(row, EMAIL_ALIASES);
        const leadSource = pickColumn(row, SOURCE_ALIASES) || "Excel Import";
        const rowNumber = i + 2; // +1 for header, +1 for 1-based

        let valid = true;
        let reason: string | undefined;
        if (!fullName) {
          valid = false;
          reason = "بدون اسم";
        } else if (!isLikelyValidPhone(phone)) {
          valid = false;
          reason = "رقم تليفون غير صالح";
        } else if (seenPhones.has(phone.replace(/\D/g, ""))) {
          valid = false;
          reason = "مكرر داخل الملف";
        }
        if (valid) seenPhones.add(phone.replace(/\D/g, ""));

        return { rowNumber, fullName, phone, email, leadSource, valid, reason };
      });

      setRows(staged);

      if (canChooseRep && salesReps.length === 0) {
        try {
          setSalesReps(await getSalesUsers());
        } catch {
          /* non-blocking — falls back to importer as the rep */
        }
      }

      if (staged.length === 0) {
        toast.error("الملف فاضي أو مفيهوش صفوف");
      }
    } catch (err) {
      console.error("[import] parse failed:", err);
      toast.error("مش قادر أقرا الملف — اتأكد إنه Excel أو CSV صحيح");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (validRows.length === 0) return;

    const repName =
      (canChooseRep && salesReps.find((u) => u.uid === assignTo)?.displayName) ||
      currentUser.displayName;
    const repId = canChooseRep ? assignTo : currentUser.uid;

    setImporting(true);
    setProgress(0);
    const skipped: ImportResult["skipped"] = [];
    let created = 0;

    // Sequential: each create runs a phone-uniqueness query, so we avoid
    // racing duplicate checks against each other within the same batch.
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      try {
        await createStudent(
          {
            fullName: r.fullName,
            phone: r.phone,
            email: r.email || "",
            leadSource: r.leadSource,
            assignedSalesRepId: repId,
            assignedSalesRepName: repName,
          },
          currentUser.uid,
          currentUser.displayName
        );
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        let reason = "فشل غير متوقع";
        if (msg.startsWith("PHONE_DUPLICATE:")) {
          reason = `مسجّل قبل كده: ${msg.substring("PHONE_DUPLICATE:".length)}`;
        } else if (msg === "PHONE_INVALID") {
          reason = "رقم تليفون غير صالح";
        }
        skipped.push({ row: r.rowNumber, name: r.fullName, reason });
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResult({ created, skipped });
    setImporting(false);
    if (created > 0) {
      toast.success(`تم استيراد ${created} طالب`);
      onImported?.();
    }
    if (created === 0) {
      toast.error("مفيش أي طالب اتضاف — راجع الأسباب");
    }
  }

  const invalidCount = rows.length - validRows.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            استيراد Excel
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد طلاب من Excel
          </DialogTitle>
          <DialogDescription>
            الأعمدة المدعومة: <b>الاسم</b> و<b>التليفون</b> (إجباريين)، و<b>البريد</b> و
            <b>المصدر</b> (اختياريين). نفس صيغة ملف التصدير.
          </DialogDescription>
        </DialogHeader>

        {/* Result view */}
        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm">
                تم إضافة <b>{result.created}</b> طالب
                {result.skipped.length > 0 ? ` — وتم تخطّي ${result.skipped.length}` : ""}.
              </span>
            </div>
            {result.skipped.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-right">صف</th>
                      <th className="px-3 py-2 text-right">الاسم</th>
                      <th className="px-3 py-2 text-right">السبب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s) => (
                      <tr key={`${s.row}-${s.name}`} className="border-t">
                        <td className="px-3 py-2">{s.row}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2 text-amber-600">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                استيراد ملف تاني
              </Button>
              <Button onClick={() => setOpen(false)}>تمام</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                disabled={parsing || importing}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              {fileName && (
                <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
              )}
            </div>

            {parsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> بقرا الملف…
              </div>
            )}

            {/* Preview summary */}
            {rows.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validRows.length} جاهز للإضافة
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {invalidCount} هيتخطّى
                    </span>
                  )}
                </div>

                {canChooseRep && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">السيلز المسؤول</label>
                    <Select value={assignTo} onValueChange={(v) => setAssignTo(v ?? currentUser.uid)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={currentUser.uid}>
                          {currentUser.displayName} (أنا)
                        </SelectItem>
                        {salesReps
                          .filter((u) => u.uid !== currentUser.uid)
                          .map((u) => (
                            <SelectItem key={u.uid} value={u.uid}>
                              {u.displayName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="max-h-56 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-right">صف</th>
                        <th className="px-3 py-2 text-right">الاسم</th>
                        <th className="px-3 py-2 text-right">التليفون</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.rowNumber} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                          <td className="px-3 py-2">{r.fullName || "—"}</td>
                          <td className="px-3 py-2" dir="ltr">{r.phone || "—"}</td>
                          <td className="px-3 py-2">
                            {r.valid ? (
                              <span className="text-emerald-600">جاهز</span>
                            ) : (
                              <span className="text-amber-600">{r.reason}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {importing && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={importing}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || parsing || validRows.length === 0}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                إضافة {validRows.length > 0 ? `(${validRows.length})` : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
