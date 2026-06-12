import { addMonths } from "date-fns";
import { InstallmentPlan, InstallmentItem, InstallmentStatus } from "@/lib/types";
import { PaymentStatus } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import {
  runQuery,
  createSubscription,
  fetchDoc,
  restCreate,
  restUpdate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToInstallmentPlans(
  studentId: string,
  callback: (plans: InstallmentPlan[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "installmentPlans" }],
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<InstallmentPlan>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `students/${studentId}`
      )) as InstallmentPlan[];
    },
    callback,
    5000
  );
}

/**
 * Reads a student's installment plans and returns true when any unpaid
 * installment is past its due date. Keeps the denormalized
 * `paymentSummary.hasOverdue` flag (read by the dashboard) accurate at every
 * write, instead of the old hardcoded `false`. Defensive: returns false on
 * any read/parse error so it never blocks the surrounding operation.
 */
export async function computeStudentHasOverdue(
  studentId: string
): Promise<boolean> {
  try {
    const plans = (await runQuery(
      { from: [{ collectionId: "installmentPlans" }] },
      `students/${studentId}`
    )) as InstallmentPlan[];
    const now = new Date();
    return plans.some((plan) =>
      (plan.installments || []).some((item) => {
        if (item.status === "paid") return false;
        const due = item.dueDate?.toDate?.();
        return due ? due < now : false;
      })
    );
  } catch {
    return false;
  }
}

/**
 * Recomputes and writes the student's `paymentSummary.hasOverdue` flag while
 * preserving the other summary fields. Non-blocking — swallows its own errors.
 */
async function refreshStudentOverdueFlag(studentId: string): Promise<void> {
  try {
    const studentData = await fetchDoc(`students/${studentId}`);
    if (!studentData) return;
    const summary =
      (studentData.paymentSummary as Record<string, unknown>) || {};
    const hasOverdue = await computeStudentHasOverdue(studentId);
    if (Boolean(summary.hasOverdue) === hasOverdue) return; // no change
    await restUpdate(`students/${studentId}`, {
      paymentSummary: { ...summary, hasOverdue },
      updatedAt: new Date(),
    });
  } catch {
    /* non-blocking */
  }
}

export async function createInstallmentPlan(
  studentId: string,
  data: {
    totalFees: number;
    numberOfInstallments: number;
    startDate: Date;
  },
  userId: string
): Promise<string> {
  const installments: Record<string, unknown>[] = [];
  const n = data.numberOfInstallments;
  const amountPerInstallment = Math.round((data.totalFees / n) * 1000) / 1000;
  // The last installment absorbs the rounding remainder so the plan sums
  // exactly to totalFees (e.g. 100/3 → 33.333, 33.333, 33.334).
  const lastAmount =
    Math.round((data.totalFees - amountPerInstallment * (n - 1)) * 1000) / 1000;

  for (let i = 0; i < n; i++) {
    // addMonths avoids JS month-overflow (e.g. Jan 31 + 1 month → Feb 28, not Mar 3).
    const dueDate = addMonths(new Date(data.startDate), i);

    installments.push({
      installmentNumber: i + 1,
      amount: i === n - 1 ? lastAmount : amountPerInstallment,
      dueDate,
      status: "pending" as InstallmentStatus,
      paidDate: null,
      paymentId: null,
    });
  }

  const now = new Date();
  const planData: Record<string, unknown> = {
    studentId,
    totalFees: data.totalFees,
    numberOfInstallments: data.numberOfInstallments,
    installments,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  return restCreate(
    `students/${studentId}/installmentPlans`,
    planData
  );
}

export async function markInstallmentPaid(
  studentId: string,
  planId: string,
  installmentNumber: number,
  currentInstallments: InstallmentItem[]
): Promise<void> {
  const now = new Date();
  const updated = currentInstallments.map((item) => {
    if (item.installmentNumber === installmentNumber) {
      return {
        ...item,
        status: "paid" as InstallmentStatus,
        paidDate: now,
      };
    }
    return item;
  });

  await restUpdate(
    `students/${studentId}/installmentPlans/${planId}`,
    {
      installments: updated,
      updatedAt: now,
    }
  );

  // Paying an installment may clear the student's overdue state.
  await refreshStudentOverdueFlag(studentId);
}

export async function deleteInstallmentPlan(
  studentId: string,
  plan: InstallmentPlan,
  userId: string,
  userName: string
): Promise<void> {
  // 1. Find and delete all payments linked to paid installments
  const paidInstallments = plan.installments.filter(
    (item) => item.status === "paid"
  );

  let totalPaidAmount = 0;

  if (paidInstallments.length > 0) {
    // Query all payments for this student
    const payments = (await runQuery(
      {
        from: [{ collectionId: "payments" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "isInstallment" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
      },
      `students/${studentId}`
    )) as Array<{ id: string; amount: number; installmentNumber: number }>;

    // Delete payments matching this plan's installment numbers
    for (const inst of paidInstallments) {
      const linkedPayment = payments.find(
        (p) => p.installmentNumber === inst.installmentNumber
      );
      if (linkedPayment) {
        totalPaidAmount += linkedPayment.amount;
        await restDelete(`students/${studentId}/payments/${linkedPayment.id}`);
      }
    }
  }

  // 2. Delete the installment plan document
  await restDelete(`students/${studentId}/installmentPlans/${plan.id}`);

  // 3. Recalculate paymentSummary if any payments were deleted
  if (totalPaidAmount > 0) {
    const studentData = await fetchDoc(`students/${studentId}`);
    if (studentData) {
      const currentSummary = (studentData.paymentSummary as Record<string, number | string | boolean>) || {
        totalFees: 0, amountPaid: 0, remainingBalance: 0, paymentStatus: "pending",
      };

      const newAmountPaid = Math.max(0, ((currentSummary.amountPaid as number) || 0) - totalPaidAmount);
      const totalFees = (currentSummary.totalFees as number) || 0;
      const newRemaining = totalFees - newAmountPaid;

      let newPaymentStatus: PaymentStatus = "pending";
      if (newRemaining <= 0 && totalFees > 0) newPaymentStatus = "paid";
      else if (newAmountPaid > 0) newPaymentStatus = "partial";

      await restUpdate(`students/${studentId}`, {
        paymentSummary: {
          totalFees,
          amountPaid: newAmountPaid,
          remainingBalance: Math.max(0, newRemaining),
          paymentStatus: newPaymentStatus,
          hasOverdue: await computeStudentHasOverdue(studentId),
        },
        updatedAt: new Date(),
      });
    }
  }

  // 4. Activity log
  const { addActivityLogEntry } = await import("./student-service");
  await addActivityLogEntry(studentId, {
    type: "payment",
    description: `Installment plan deleted (${plan.numberOfInstallments} installments, ${plan.totalFees} total). Deleted by ${userName}`,
    createdBy: userId,
    createdByName: userName,
    followUpDate: null,
  });

  // 5. Audit log
  await writeAuditLog({
    action: "delete",
    entityType: "installmentPlan",
    entityId: plan.id,
    userId,
    userName,
    changes: {
      totalFees: { from: plan.totalFees, to: 0 },
      numberOfInstallments: { from: plan.numberOfInstallments, to: 0 },
    },
  });
}
