import { EmbassyPayment } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import {
  runQuery,
  createSubscription,
  restCreate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

// ─── Public API ──────────────────────────────────────────────────────────────

/** REST-based polling subscription for all embassy payments */
export function subscribeToEmbassyPayments(
  callback: (payments: EmbassyPayment[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "embassyPayments" }],
    orderBy: [
      { field: { fieldPath: "paymentDate" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<EmbassyPayment>(
    async () => {
      return (await runQuery(structuredQuery)) as EmbassyPayment[];
    },
    callback
  );
}

export async function createEmbassyPayment(
  data: {
    studentId: string;
    studentName: string;
    amount: number;
    paymentDate: Date;
    notes?: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const paymentData: Record<string, unknown> = {
    studentId: data.studentId,
    studentName: data.studentName,
    amount: data.amount,
    paymentDate: data.paymentDate,
    notes: data.notes || "",
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date(),
  };

  const id = await restCreate("embassyPayments", paymentData);

  // Audit log (non-blocking)
  try {
    await writeAuditLog({
      action: "create",
      entityType: "payment",
      entityId: id,
      userId,
      userName,
      changes: {
        type: { from: null, to: "embassy_transfer" },
        studentName: { from: null, to: data.studentName },
        amount: { from: null, to: data.amount },
      },
    });
  } catch (e) {
    console.error("[embassy-payment-service] audit log error:", e);
  }

  return id;
}

export async function deleteEmbassyPayment(
  paymentId: string,
  userId: string,
  userName: string,
  studentName: string,
  amount: number
): Promise<void> {
  await restDelete(`embassyPayments/${paymentId}`);

  try {
    await writeAuditLog({
      action: "delete",
      entityType: "payment",
      entityId: paymentId,
      userId,
      userName,
      changes: {
        type: { from: "embassy_transfer", to: null },
        studentName: { from: studentName, to: null },
        amount: { from: amount, to: null },
      },
    });
  } catch (e) {
    console.error("[embassy-payment-service] audit log error:", e);
  }
}
