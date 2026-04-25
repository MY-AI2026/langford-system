"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, PaymentFormData } from "@/lib/utils/validators";
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/constants";
import { PaymentMethod, Enrollment } from "@/lib/types";
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

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  remainingBalance?: number;
  totalFees?: number;
  amountPaid?: number;
  enrollments?: Enrollment[];
}

export function PaymentForm({
  open,
  onOpenChange,
  onSubmit,
  remainingBalance,
  totalFees = 0,
  amountPaid = 0,
  enrollments,
}: PaymentFormProps) {
  const isFirstPayment = totalFees <= 0;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      amount: 0,
      totalAmount: 0,
      method: "cash",
      paymentDate: new Date(),
      notes: "",
      courseId: "",
      courseName: "",
    },
  });

  const watchedTotal = watch("totalAmount") || 0;
  const watchedAmount = watch("amount") || 0;
  const effectiveTotal = isFirstPayment ? Number(watchedTotal) : totalFees;
  const liveRemaining = Math.max(
    0,
    effectiveTotal - amountPaid - Number(watchedAmount || 0)
  );

  const activeEnrollments = enrollments?.filter((e) => e.status === "active") || [];

  function handleCourseChange(enrollmentId: string) {
    if (!enrollmentId || enrollmentId === "none") {
      setValue("courseId", "");
      setValue("courseName", "");
      return;
    }
    const enrollment = activeEnrollments.find((e) => e.id === enrollmentId);
    if (enrollment) {
      setValue("courseId", enrollment.courseId);
      setValue("courseName", enrollment.courseName);
    }
  }

  async function handleFormSubmit(data: PaymentFormData) {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totalAmount">
              الإجمالي المتفق عليه (Total) {isFirstPayment ? "*" : ""}
              {!isFirstPayment && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (مقفول — تم تحديده من قبل)
                </span>
              )}
            </Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.001"
              min={0}
              placeholder="0.000"
              readOnly={!isFirstPayment}
              value={isFirstPayment ? undefined : totalFees.toFixed(3)}
              {...(isFirstPayment ? register("totalAmount") : {})}
              className={!isFirstPayment ? "bg-muted" : ""}
            />
            {errors.totalAmount && (
              <p className="text-sm text-destructive">
                {errors.totalAmount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              المدفوع الآن (Paid Now) *
              {remainingBalance !== undefined && !isFirstPayment && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (المتبقي قبل الدفع: {remainingBalance.toFixed(3)} KWD)
                </span>
              )}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min={0}
              placeholder="0.000"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {effectiveTotal > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الإجمالي:</span>
                <span className="font-medium">{effectiveTotal.toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المدفوع سابقاً:</span>
                <span>{amountPaid.toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المدفوع الآن:</span>
                <span>{Number(watchedAmount || 0).toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-medium">المتبقي بعد الدفع:</span>
                <span className={`font-semibold ${liveRemaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {liveRemaining.toFixed(3)} KWD
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              value={watch("method")}
              onValueChange={(val) => setValue("method", val as PaymentMethod)}
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

          {activeEnrollments.length > 0 && (
            <div className="space-y-2">
              <Label>Course (optional)</Label>
              <Select
                value={watch("courseId") || "none"}
                onValueChange={(val) => handleCourseChange(val || "none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific course</SelectItem>
                  {activeEnrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      {enrollment.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              {...register("paymentDate", { valueAsDate: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
