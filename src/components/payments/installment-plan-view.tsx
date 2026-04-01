"use client";

import { useEffect, useState } from "react";
import {
  subscribeToInstallmentPlans,
  markInstallmentPaid,
} from "@/lib/services/installment-service";
import { InstallmentPlan, InstallmentItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Plus } from "lucide-react";
import { InstallmentPlanForm } from "./installment-plan-form";
import { toast } from "sonner";

interface InstallmentPlanViewProps {
  studentId: string;
  userId: string;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "overdue") return "destructive";
  return "secondary";
}

export function InstallmentPlanView({
  studentId,
  userId,
}: InstallmentPlanViewProps) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToInstallmentPlans(studentId, (data) => {
      setPlans(data);
      setLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  async function handleMarkPaid(
    planId: string,
    installmentNumber: number,
    currentInstallments: InstallmentItem[]
  ) {
    const key = `${planId}-${installmentNumber}`;
    setMarkingPaid(key);
    try {
      await markInstallmentPaid(
        studentId,
        planId,
        installmentNumber,
        currentInstallments
      );
      toast.success(`Installment ${installmentNumber} marked as paid`);
    } catch {
      toast.error("Failed to update installment");
    } finally {
      setMarkingPaid(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Installment Plans</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">No installment plans created</p>
        </div>
      ) : (
        plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>
                  {plan.numberOfInstallments} installments &mdash;{" "}
                  {formatCurrency(plan.totalFees)} total
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {formatDate(plan.createdAt)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {plan.installments.map((item) => {
                  const key = `${plan.id}-${item.installmentNumber}`;
                  const isOverdue =
                    item.status === "pending" &&
                    item.dueDate &&
                    item.dueDate.toDate() < new Date();
                  const effectiveStatus = isOverdue ? "overdue" : item.status;

                  return (
                    <div
                      key={item.installmentNumber}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        #{item.installmentNumber}
                      </span>
                      <span className="text-sm">
                        {formatDate(item.dueDate)}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                      <Badge variant={statusVariant(effectiveStatus)} className="capitalize">
                        {effectiveStatus}
                      </Badge>
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={markingPaid === key}
                          onClick={() =>
                            handleMarkPaid(
                              plan.id,
                              item.installmentNumber,
                              plan.installments
                            )
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === "paid" && (
                        <span className="text-xs text-green-600">
                          {item.paidDate ? formatDate(item.paidDate) : "Paid"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <InstallmentPlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        studentId={studentId}
        userId={userId}
      />
    </div>
  );
}
