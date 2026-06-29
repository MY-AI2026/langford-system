"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { PaymentMethod } from "@/lib/types";
import { PAYMENT_METHOD_LABELS, IELTS_EXAM_FEE } from "@/lib/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface IeltsPaymentFormData {
  amount: number;
  method: PaymentMethod;
  paymentDate: Date;
  notes?: string;
}

interface IeltsPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IeltsPaymentFormData) => Promise<void>;
}

export function IeltsPaymentDialog({
  open,
  onOpenChange,
  onSubmit,
}: IeltsPaymentDialogProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState<string>(String(IELTS_EXAM_FEE));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  function reset() {
    setAmount(String(IELTS_EXAM_FEE));
    setMethod("cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t("amountMustBeGreaterThanZero"));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        method,
        paymentDate: new Date(paymentDate),
        notes: notes.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch {
      setError(t("failedToRecordIeltsPayment"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("recordIeltsExamPayment")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">
            {t("defaultIeltsExamFee")}: <strong>{IELTS_EXAM_FEE} KWD</strong>.{" "}
            {t("ieltsFeeSeparateNote")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ielts-amount">{t("amount")} (KWD) *</Label>
            <Input
              id="ielts-amount"
              type="number"
              step="0.001"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(IELTS_EXAM_FEE)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("paymentMethod")} *</Label>
            <Select
              value={method}
              onValueChange={(val) => setMethod(val as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ielts-date">{t("paymentDate")} *</Label>
            <Input
              id="ielts-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ielts-notes">{t("notes")}</Label>
            <Textarea
              id="ielts-notes"
              placeholder={t("optionalNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("recordIeltsPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
