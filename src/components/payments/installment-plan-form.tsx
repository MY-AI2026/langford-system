"use client";

import { useState } from "react";
import { addMonths } from "date-fns";
import { createInstallmentPlan } from "@/lib/services/installment-service";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

interface InstallmentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  userId: string;
  onCreated?: () => void;
}

export function InstallmentPlanForm({
  open,
  onOpenChange,
  studentId,
  userId,
  onCreated,
}: InstallmentPlanFormProps) {
  const [totalFees, setTotalFees] = useState("");
  const [numInstallments, setNumInstallments] = useState("3");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  const totalFeesNum = parseFloat(totalFees) || 0;
  const numInst = parseInt(numInstallments) || 1;
  const perInstallment = totalFeesNum > 0 ? Math.round((totalFeesNum / numInst) * 1000) / 1000 : 0;

  const preview = totalFeesNum > 0 && numInst > 0
    ? Array.from({ length: numInst }).map((_, i) => {
        const d = addMonths(new Date(startDate), i);
        return { number: i + 1, amount: perInstallment, dueDate: d };
      })
    : [];

  async function handleSubmit() {
    if (!totalFeesNum || totalFeesNum <= 0) {
      toast.error("Please enter a valid total fees amount");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    setSaving(true);
    try {
      await createInstallmentPlan(
        studentId,
        {
          totalFees: totalFeesNum,
          numberOfInstallments: numInst,
          startDate: new Date(startDate),
        },
        userId
      );
      toast.success("Installment plan created");
      onCreated?.();
      onOpenChange(false);
      setTotalFees("");
      setNumInstallments("3");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create installment plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Installment Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Total Fees (KWD)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={totalFees}
              onChange={(e) => setTotalFees(e.target.value)}
              placeholder="0.000"
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Installments</Label>
            <Select value={numInstallments} onValueChange={(val) => { if (val !== null) setNumInstallments(val); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} installments
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                {preview.map((item) => (
                  <div
                    key={item.number}
                    className="flex justify-between px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      Installment {item.number}
                    </span>
                    <span>{formatDate(Timestamp.fromDate(item.dueDate))}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-right">
                Total: {formatCurrency(totalFeesNum)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
