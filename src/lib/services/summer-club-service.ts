import {
  SummerClubStudent,
  SummerClubPayment,
  Gender,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import { generateReceiptNumber } from "@/lib/utils/format";
import {
  getToken as restGetToken,
  fetchDoc,
  runQuery,
  createSubscription,
  BASE,
  restCreate,
  restUpdate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

const COLLECTION = "summerClubStudents";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computePaymentStatus(totalFees: number, amountPaid: number): PaymentStatus {
  if (totalFees <= 0 && amountPaid === 0) return "pending";
  if (amountPaid <= 0) return "pending";
  if (amountPaid >= totalFees) return "paid";
  return "partial";
}

// ─── Students CRUD ───────────────────────────────────────────────────────────

/** Subscribe to summer club students with role-based filtering applied client-side. */
export function subscribeToSummerClubStudents(
  filters: {
    role: UserRole;
    userId: string;
    gender?: Gender | "all";
    registered?: "all" | "yes" | "no";
    searchQuery?: string;
  },
  callback: (students: SummerClubStudent[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
  };

  return createSubscription<SummerClubStudent>(
    async () => {
      try {
        let students = (await runQuery(structuredQuery)) as SummerClubStudent[];

        // Sales reps see only their own records
        if (filters.role === "sales") {
          students = students.filter((s) => s.assignedSalesRepId === filters.userId);
        }

        if (filters.gender && filters.gender !== "all") {
          students = students.filter((s) => s.gender === filters.gender);
        }

        if (filters.registered === "yes") {
          students = students.filter((s) => s.isRegistered === true);
        } else if (filters.registered === "no") {
          students = students.filter((s) => s.isRegistered !== true);
        }

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          students = students.filter(
            (s) =>
              s.fullName?.toLowerCase().includes(q) ||
              s.phone?.includes(q) ||
              s.guardianPhone?.includes(q)
          );
        }

        students.sort((a, b) => {
          const ad = (a.createdAt as unknown as { toDate?: () => Date })?.toDate?.() ?? new Date(0);
          const bd = (b.createdAt as unknown as { toDate?: () => Date })?.toDate?.() ?? new Date(0);
          return bd.getTime() - ad.getTime();
        });

        return students;
      } catch (e) {
        console.error("[summer-club] subscribe failed:", e);
        return [];
      }
    },
    callback
  );
}

export async function getSummerClubStudent(id: string): Promise<SummerClubStudent | null> {
  const result = await fetchDoc(`${COLLECTION}/${id}`);
  return result as SummerClubStudent | null;
}

/** Check if a phone already exists in summer club (separate from main students). */
export async function findSummerClubByPhone(
  phone: string,
  excludeId?: string
): Promise<SummerClubStudent | null> {
  const normalized = phone.trim().replace(/\s+/g, "");
  const query = {
    from: [{ collectionId: COLLECTION }],
    where: {
      fieldFilter: {
        field: { fieldPath: "phone" },
        op: "EQUAL",
        value: { stringValue: normalized },
      },
    },
    limit: 5,
  };
  const results = (await runQuery(query)) as SummerClubStudent[];
  const others = excludeId ? results.filter((s) => s.id !== excludeId) : results;
  return others.length > 0 ? others[0] : null;
}

export async function createSummerClubStudent(
  data: {
    fullName: string;
    phone: string;
    gender: Gender;
    age?: number | null;
    guardianName?: string;
    guardianPhone?: string;
    notes?: string;
    isRegistered: boolean;
    totalFees: number;
    assignedSalesRepId: string;
    assignedSalesRepName: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const dup = await findSummerClubByPhone(data.phone);
  if (dup) throw new Error(`PHONE_DUPLICATE:${dup.fullName}`);

  const now = new Date();
  const docData: Record<string, unknown> = {
    fullName: data.fullName,
    phone: data.phone.trim().replace(/\s+/g, ""),
    gender: data.gender,
    age: data.age ?? null,
    guardianName: data.guardianName || "",
    guardianPhone: data.guardianPhone || "",
    notes: data.notes || "",
    isRegistered: data.isRegistered,
    registrationDate: now,
    assignedSalesRepId: data.assignedSalesRepId,
    assignedSalesRepName: data.assignedSalesRepName,
    paymentSummary: {
      totalFees: data.totalFees || 0,
      amountPaid: 0,
      remainingBalance: data.totalFees || 0,
      paymentStatus: computePaymentStatus(data.totalFees || 0, 0),
    },
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const newId = await restCreate(COLLECTION, docData);

  try {
    await writeAuditLog({
      action: "create",
      entityType: "student",
      entityId: `summer:${newId}`,
      userId,
      userName,
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }

  return newId;
}

export async function updateSummerClubStudent(
  id: string,
  data: Partial<{
    fullName: string;
    phone: string;
    gender: Gender;
    age: number | null;
    guardianName: string;
    guardianPhone: string;
    notes: string;
    isRegistered: boolean;
    totalFees: number;
    assignedSalesRepId: string;
    assignedSalesRepName: string;
  }>,
  userId: string,
  userName: string
): Promise<void> {
  if (data.phone) {
    const dup = await findSummerClubByPhone(data.phone, id);
    if (dup) throw new Error(`PHONE_DUPLICATE:${dup.fullName}`);
  }

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };

  // If totalFees is being updated, recompute the payment summary
  if (typeof data.totalFees === "number") {
    const current = await getSummerClubStudent(id);
    const amountPaid = current?.paymentSummary?.amountPaid ?? 0;
    const totalFees = data.totalFees;
    updates.paymentSummary = {
      totalFees,
      amountPaid,
      remainingBalance: Math.max(0, totalFees - amountPaid),
      paymentStatus: computePaymentStatus(totalFees, amountPaid),
    };
    delete (updates as Record<string, unknown>).totalFees;
  }

  if (data.phone) {
    updates.phone = data.phone.trim().replace(/\s+/g, "");
  }

  await restUpdate(`${COLLECTION}/${id}`, updates);

  try {
    await writeAuditLog({
      action: "update",
      entityType: "student",
      entityId: `summer:${id}`,
      userId,
      userName,
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }
}

export async function deleteSummerClubStudent(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  // Delete payments subcollection
  try {
    const token = await restGetToken();
    const payRes = await fetch(`${BASE}/${COLLECTION}/${id}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "payments" }] } }),
      cache: "no-store",
    });
    if (payRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = (await payRes.json()).filter((r: any) => r.document);
      for (const r of docs) {
        const docId = (r.document.name as string).split("/").pop();
        await restDelete(`${COLLECTION}/${id}/payments/${docId}`);
      }
    }
  } catch (e) {
    console.warn("[summer-club] payments cleanup failed:", e);
  }

  await restDelete(`${COLLECTION}/${id}`);

  try {
    await writeAuditLog({
      action: "delete",
      entityType: "student",
      entityId: `summer:${id}`,
      userId,
      userName,
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function subscribeToSummerClubPayments(
  studentId: string,
  callback: (payments: SummerClubPayment[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "payments" }],
    orderBy: [{ field: { fieldPath: "paymentDate" }, direction: "DESCENDING" }],
  };

  return createSubscription<SummerClubPayment>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `${COLLECTION}/${studentId}`
      )) as SummerClubPayment[];
    },
    callback
  );
}

export async function addSummerClubPayment(
  studentId: string,
  data: {
    amount: number;
    method: PaymentMethod;
    paymentDate: Date;
    notes?: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const receiptNumber = generateReceiptNumber();

  const student = await getSummerClubStudent(studentId);
  if (!student) throw new Error("Summer club student not found");

  const summary = student.paymentSummary || {
    totalFees: 0,
    amountPaid: 0,
    remainingBalance: 0,
    paymentStatus: "pending" as PaymentStatus,
  };

  const newAmountPaid = (summary.amountPaid || 0) + data.amount;
  const totalFees = summary.totalFees || 0;
  const newRemaining = Math.max(0, totalFees - newAmountPaid);

  const paymentData: Record<string, unknown> = {
    amount: data.amount,
    paymentDate: data.paymentDate,
    method: data.method,
    receiptNumber,
    notes: data.notes || "",
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date(),
  };

  const paymentId = await restCreate(
    `${COLLECTION}/${studentId}/payments`,
    paymentData
  );

  await restUpdate(`${COLLECTION}/${studentId}`, {
    paymentSummary: {
      totalFees,
      amountPaid: newAmountPaid,
      remainingBalance: newRemaining,
      paymentStatus: computePaymentStatus(totalFees, newAmountPaid),
    },
    updatedAt: new Date(),
  });

  try {
    await writeAuditLog({
      action: "payment",
      entityType: "payment",
      entityId: `summer:${paymentId}`,
      userId,
      userName,
      changes: { amount: { from: 0, to: data.amount } },
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }

  return paymentId;
}

export async function deleteSummerClubPayment(
  studentId: string,
  payment: SummerClubPayment,
  userId: string,
  userName: string
): Promise<void> {
  await restDelete(`${COLLECTION}/${studentId}/payments/${payment.id}`);

  const student = await getSummerClubStudent(studentId);
  if (!student) return;

  const summary = student.paymentSummary || {
    totalFees: 0,
    amountPaid: 0,
    remainingBalance: 0,
    paymentStatus: "pending" as PaymentStatus,
  };

  const newAmountPaid = Math.max(0, (summary.amountPaid || 0) - payment.amount);
  const totalFees = summary.totalFees || 0;
  const newRemaining = Math.max(0, totalFees - newAmountPaid);

  await restUpdate(`${COLLECTION}/${studentId}`, {
    paymentSummary: {
      totalFees,
      amountPaid: newAmountPaid,
      remainingBalance: newRemaining,
      paymentStatus: computePaymentStatus(totalFees, newAmountPaid),
    },
    updatedAt: new Date(),
  });

  try {
    await writeAuditLog({
      action: "delete",
      entityType: "payment",
      entityId: `summer:${payment.id}`,
      userId,
      userName,
      changes: { amount: { from: payment.amount, to: 0 } },
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }
}
