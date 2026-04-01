import { InstallmentPlan, InstallmentItem, InstallmentStatus } from "@/lib/types";
import {
  runQuery,
  createSubscription,
  restCreate,
  restUpdate,
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
