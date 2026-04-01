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
  enrollments?: Enrollment[];
}

export function PaymentForm({
  open,
  onOpenChange,
  onSubmit,
  remainingBalance,
  enrollments,
}: PaymentFormProps) {
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
      method: "cash",
      paymentDate: new Date(),
      notes: "",
      courseId: "",
      courseName: "",
    },
  });

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
            <Label htmlFor="amount">
              Amount *
              {remainingBalance !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Remaining: {remainingBalance.toFixed(3)} KWD)
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
