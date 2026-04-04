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
  const amountPerInstallment = Math.round((data.totalFees / data.numberOfInstallments) * 1000) / 1000;

  for (let i = 0; i < data.numberOfInstallments; i++) {
    const dueDate = new Date(data.startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({
      installmentNumber: i + 1,
      amount: amountPerInstallment,
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
          hasOverdue: Boolean(currentSummary.hasOverdue) || false,
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
