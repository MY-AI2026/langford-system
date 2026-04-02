import { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import { generateReceiptNumber } from "@/lib/utils/format";
import {
  runQuery,
  createSubscription,
  fetchDoc,
  restCreate,
  restUpdate,
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
