"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import {
  subscribeToInstallmentPlans,
  markInstallmentPaid,
  deleteInstallmentPlan,
} from "@/lib/services/installment-service";
import { InstallmentPlan, InstallmentItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { InstallmentPlanForm } from "./installment-plan-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface InstallmentPlanViewProps {
  studentId: string;
  userId: string;
  isAdmin?: boolean;
  userName?: string;
  readOnly?: boolean;
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
  isAdmin = false,
  userName = "",
  readOnly = false,
}: InstallmentPlanViewProps) {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstallmentPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.success(`${t("installment")} ${installmentNumber} — ${t("markedAsPaid")}`);
    } catch {
      toast.error(t("failedToUpdateInstallment"));
    } finally {
      setMarkingPaid(null);
    }
  }

  async function handleDeletePlan() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInstallmentPlan(studentId, deleteTarget, userId, userName);
      toast.success(t("installmentPlanDeleted"));
    } catch {
      toast.error(t("failedToDeleteInstallmentPlan"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const paidCount = (plan: InstallmentPlan) =>
    plan.installments.filter((i) => i.status === "paid").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t("installmentPlans")}</h3>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="me-2 h-4 w-4" />
            {t("createPlan")}
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">{t("noInstallmentPlansCreated")}</p>
        </div>
      ) : (
        plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>
                  {plan.numberOfInstallments} {t("installmentsLabel")} &mdash;{" "}
                  {formatCurrency(plan.totalFees)} {t("totalLower")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("created")} {formatDate(plan.createdAt)}
                  </span>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t("deletePlan")}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(plan)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
                        {effectiveStatus === "paid"
                          ? t("paid")
                          : effectiveStatus === "overdue"
                            ? t("overdue")
                            : t("pending")}
                      </Badge>
                      {!readOnly && item.status === "pending" && (
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
                          {item.paidDate ? formatDate(item.paidDate) : t("paid")}
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("deleteInstallmentPlan")}</DialogTitle>
            <DialogDescription>
              {t("deleteInstallmentPlanConfirm")}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">{t("total")}:</span> {formatCurrency(deleteTarget.totalFees)}</p>
              <p><span className="font-medium">{t("installments")}:</span> {deleteTarget.numberOfInstallments}</p>
              <p><span className="font-medium">{t("paid")}:</span> {paidCount(deleteTarget)} {t("of")} {deleteTarget.numberOfInstallments}</p>
            </div>
          )}
          <p className="text-sm text-destructive">
            {t("deleteInstallmentPlanWarning")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeletePlan} disabled={deleting}>
              {deleting ? t("deleting") : t("deletePlan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
