import { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import { generateReceiptNumber } from "@/lib/utils/format";
import {
  runQuery,
  createSubscription,
  fetchDoc,
  restCreate,
  restUpdate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

// ─── Public API ──────────────────────────────────────────────────────────────

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToPayments(
  studentId: string,
  callback: (payments: Payment[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "payments" }],
    orderBy: [
      { field: { fieldPath: "paymentDate" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<Payment>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `students/${studentId}`
      )) as Payment[];
    },
    callback
  );
}

export async function addPayment(
  studentId: string,
  data: {
    amount: number;
    method: PaymentMethod;
    paymentDate: Date;
    notes?: string;
    isInstallment?: boolean;
    installmentNumber?: number | null;
    courseId?: string;
    courseName?: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const receiptNumber = generateReceiptNumber();

  // Read current student data via REST
  const studentData = await fetchDoc(`students/${studentId}`);
  if (!studentData) throw new Error("Student not found");

  const currentSummary = (studentData.paymentSummary as Record<string, number | string>) || {
    totalFees: 0, amountPaid: 0, remainingBalance: 0, paymentStatus: "pending",
  };

  const newAmountPaid = ((currentSummary.amountPaid as number) || 0) + data.amount;
  const newRemaining = ((currentSummary.totalFees as number) || 0) - newAmountPaid;

  let newPaymentStatus: PaymentStatus = "partial";
  if (newRemaining <= 0) newPaymentStatus = "paid";
  else if (newAmountPaid === 0) newPaymentStatus = "pending";

  const paymentData: Record<string, unknown> = {
    amount: data.amount,
    paymentDate: data.paymentDate,
    method: data.method,
    receiptNumber,
    notes: data.notes || "",
    isInstallment: data.isInstallment || false,
    installmentNumber: data.installmentNumber || null,
    createdBy: userId,
    createdAt: new Date(),
  };
  if (data.courseId) paymentData.courseId = data.courseId;
  if (data.courseName) paymentData.courseName = data.courseName;

  const paymentId = await restCreate(
    `students/${studentId}/payments`,
    paymentData
  );

  await restUpdate(`students/${studentId}`, {
    paymentSummary: {
      totalFees: (currentSummary.totalFees as number) || 0,
      amountPaid: newAmountPaid,
      remainingBalance: Math.max(0, newRemaining),
      paymentStatus: newPaymentStatus,
      hasOverdue: Boolean(currentSummary.hasOverdue) || false,
    },
    updatedAt: new Date(),
  });

  // Activity log
  const { addActivityLogEntry } = await import("./student-service");
  await addActivityLogEntry(studentId, {
    type: "payment",
    description: `Payment of ${data.amount} recorded (${data.method}). Receipt: ${receiptNumber}`,
    createdBy: userId,
    createdByName: userName,
    followUpDate: null,
  });

  await writeAuditLog({
    action: "payment",
    entityType: "payment",
    entityId: paymentId,
    userId,
    userName,
    changes: { amount: { from: 0, to: data.amount } },
  });

  return paymentId;
}

export async function deletePayment(
  studentId: string,
  payment: Payment,
  userId: string,
  userName: string
): Promise<void> {
  // 1. Delete the payment document
  await restDelete(`students/${studentId}/payments/${payment.id}`);

  // 2. Recalculate paymentSummary
  const studentData = await fetchDoc(`students/${studentId}`);
  if (!studentData) throw new Error("Student not found");

  const currentSummary = (studentData.paymentSummary as Record<string, number | string | boolean>) || {
    totalFees: 0, amountPaid: 0, remainingBalance: 0, paymentStatus: "pending",
  };

  const newAmountPaid = Math.max(0, ((currentSummary.amountPaid as number) || 0) - payment.amount);
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

  // 3. If installment payment, reset the installment item
  if (payment.isInstallment && payment.installmentNumber) {
    const plans = (await runQuery(
      { from: [{ collectionId: "installmentPlans" }] },
      `students/${studentId}`
    )) as Array<{ id: string; installments: Array<Record<string, unknown>> }>;

    for (const plan of plans) {
      const installments = plan.installments || [];
      const hasMatch = installments.some(
        (item: Record<string, unknown>) => item.installmentNumber === payment.installmentNumber
      );
      if (hasMatch) {
        const updated = installments.map((item: Record<string, unknown>) => {
          if (item.installmentNumber === payment.installmentNumber) {
            return { ...item, status: "pending", paidDate: null, paymentId: null };
          }
          return item;
        });
        await restUpdate(`students/${studentId}/installmentPlans/${plan.id}`, {
          installments: updated,
          updatedAt: new Date(),
        });
        break;
      }
    }
  }

  // 4. Activity log
  const { addActivityLogEntry } = await import("./student-service");
  await addActivityLogEntry(studentId, {
    type: "payment",
    description: `Payment of ${payment.amount} deleted (Receipt: ${payment.receiptNumber}). Deleted by ${userName}`,
    createdBy: userId,
    createdByName: userName,
    followUpDate: null,
  });

  // 5. Audit log
  await writeAuditLog({
    action: "delete",
    entityType: "payment",
    entityId: payment.id,
    userId,
    userName,
    changes: { amount: { from: payment.amount, to: 0 } },
  });
}

export async function setTotalFees(
  studentId: string,
  totalFees: number,
  userId: string,
  userName: string
) {
  const studentData = await fetchDoc(`students/${studentId}`);
  if (!studentData) throw new Error("Student not found");

  const summary = (studentData.paymentSummary as Record<string, number | string>) || {};
  const amountPaid = (summary.amountPaid as number) || 0;
  const remaining = totalFees - amountPaid;

  let paymentStatus: PaymentStatus = "pending";
  if (remaining <= 0) paymentStatus = "paid";
  else if (amountPaid > 0) paymentStatus = "partial";

  await restUpdate(`students/${studentId}`, {
    paymentSummary: {
      totalFees,
      amountPaid,
      remainingBalance: Math.max(0, remaining),
      paymentStatus,
      hasOverdue: false,
    },
    updatedAt: new Date(),
  });

  await writeAuditLog({
    action: "update",
    entityType: "student",
    entityId: studentId,
    userId,
    userName,
    changes: { totalFees: { from: null, to: totalFees } },
  });
}
