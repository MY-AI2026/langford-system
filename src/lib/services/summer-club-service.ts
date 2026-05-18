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
import { normalizePhone, phonesMatch } from "@/lib/utils/phone";
import {
  getToken as restGetToken,
  fetchDoc,
  runQuery,
  createSubscription,
  BASE,
  restCreate,
  restUpdate,
  restDelete,
  parseFields,
} from "@/lib/firebase/rest-helpers";

const COLLECTION = "summerClubStudents";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computePaymentStatus(totalFees: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "pending";
  if (totalFees > 0 && amountPaid >= totalFees) return "paid";
  return "partial";
}

function computeSummary(totalFees: number, amountPaid: number) {
  const fees = Math.max(0, totalFees);
  const paid = Math.max(0, amountPaid);
  return {
    totalFees: fees,
    amountPaid: paid,
    remainingBalance: Math.max(0, fees - paid),
    paymentStatus: computePaymentStatus(fees, paid),
  };
}

/**
 * Strict phone lookup — throws on transport/permission failure instead of
 * silently returning [] like runQuery does. Used by uniqueness checks where a
 * false "not found" would create duplicates.
 */
async function queryByPhoneStrict(phone: string): Promise<SummerClubStudent[]> {
  // Resilient token fetch — if currentUser is briefly null (e.g. token refresh
  // mid-flight), wait one tick and retry once before giving up.
  let token: string;
  try {
    token = await restGetToken();
  } catch {
    await new Promise((r) => setTimeout(r, 300));
    token = await restGetToken();
  }

  const body = {
    structuredQuery: {
      from: [{ collectionId: COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: "phone" },
          op: "EQUAL",
          value: { stringValue: phone },
        },
      },
      limit: 10,
    },
  };
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PHONE_LOOKUP_FAILED: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error("PHONE_LOOKUP_FAILED: unexpected response");
  }
  return json
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r?.document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => ({
      id: r.document.name.split("/").pop(),
      ...parseFields(r.document.fields || {}),
    })) as SummerClubStudent[];
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

/**
 * Check if a phone already exists in summer club (separate from main students).
 * Throws PHONE_LOOKUP_FAILED on network/permission errors instead of silently
 * returning null — which would let duplicates slip through.
 */
export async function findSummerClubByPhone(
  phone: string,
  excludeId?: string
): Promise<SummerClubStudent | null> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 6) return null;

  // Fast path: EQUAL on canonical form (matches records saved after this code shipped)
  const results = await queryByPhoneStrict(normalized);
  const fastOthers = excludeId ? results.filter((s) => s.id !== excludeId) : results;
  if (fastOthers.length > 0) return fastOthers[0];

  // Fallback: legacy records stored with country code / spaces / Arabic digits
  // won't match EQUAL. Pull all and compare client-side. Only runs when fast
  // path missed (so cost is paid only when adding a genuinely new number).
  const all = (await runQuery({
    from: [{ collectionId: COLLECTION }],
  })) as SummerClubStudent[];
  const candidates = all.filter((s) => phonesMatch(s.phone, normalized));
  const others = excludeId ? candidates.filter((s) => s.id !== excludeId) : candidates;
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
  const normalizedPhone = normalizePhone(data.phone);
  if (!normalizedPhone || normalizedPhone.length < 6) {
    throw new Error("PHONE_INVALID");
  }

  // Pre-create uniqueness check.
  // If this fails with a network/auth error (PHONE_LOOKUP_FAILED), don't block
  // the user — fall through to create + post-check, which is the real
  // defense-in-depth layer. A genuine duplicate will still be caught after
  // create runs the second query.
  try {
    const dup = await findSummerClubByPhone(normalizedPhone);
    if (dup) throw new Error(`PHONE_DUPLICATE:${dup.fullName}`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("PHONE_DUPLICATE:")) throw e;
    console.warn("[summer-club] pre-create dup check failed (will rely on post-check):", e);
  }

  const now = new Date();
  const docData: Record<string, unknown> = {
    fullName: data.fullName,
    phone: normalizedPhone,
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
      ...computeSummary(data.totalFees || 0, 0),
    },
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const newId = await restCreate(COLLECTION, docData);

  // Post-create race-condition guard: if two requests slipped through the
  // pre-check at the same time, the newer record self-destructs so only the
  // earliest survives.
  try {
    const all = await queryByPhoneStrict(normalizedPhone);
    if (all.length > 1) {
      const winner = all.reduce((a, b) => {
        const at = (a.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        const bt = (b.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        return at <= bt ? a : b;
      });
      if (winner.id !== newId) {
        await restDelete(`${COLLECTION}/${newId}`);
        throw new Error(`PHONE_DUPLICATE:${winner.fullName}`);
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("PHONE_DUPLICATE:")) throw e;
    console.warn("[summer-club] post-create dup check failed:", e);
  }

  try {
    await writeAuditLog({
      action: "create",
      entityType: "summerClubStudent",
      entityId: newId,
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
  // Normalize phone first so dup-check and stored value share the same canonical form
  let normalizedPhone: string | undefined;
  if (data.phone) {
    normalizedPhone = normalizePhone(data.phone);
    if (!normalizedPhone || normalizedPhone.length < 6) {
      throw new Error("PHONE_INVALID");
    }
    try {
      const dup = await findSummerClubByPhone(normalizedPhone, id);
      if (dup) throw new Error(`PHONE_DUPLICATE:${dup.fullName}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("PHONE_DUPLICATE:")) throw e;
      console.warn("[summer-club] update dup check failed (proceeding):", e);
    }
  }

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };

  // If totalFees is being updated, recompute the payment summary
  if (typeof data.totalFees === "number") {
    const current = await getSummerClubStudent(id);
    const amountPaid = current?.paymentSummary?.amountPaid ?? 0;
    updates.paymentSummary = computeSummary(data.totalFees, amountPaid);
    delete (updates as Record<string, unknown>).totalFees;
  }

  if (normalizedPhone) {
    updates.phone = normalizedPhone;
  }

  await restUpdate(`${COLLECTION}/${id}`, updates);

  try {
    await writeAuditLog({
      action: "update",
      entityType: "summerClubStudent",
      entityId: id,
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
      entityType: "summerClubStudent",
      entityId: id,
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

  const summary = student.paymentSummary;
  const totalFees = summary?.totalFees ?? 0;
  const newAmountPaid = (summary?.amountPaid ?? 0) + data.amount;

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
    paymentSummary: computeSummary(totalFees, newAmountPaid),
    updatedAt: new Date(),
  });

  try {
    await writeAuditLog({
      action: "payment",
      entityType: "summerClubPayment",
      entityId: paymentId,
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

  const totalFees = student.paymentSummary?.totalFees ?? 0;
  const newAmountPaid = Math.max(
    0,
    (student.paymentSummary?.amountPaid ?? 0) - payment.amount
  );

  await restUpdate(`${COLLECTION}/${studentId}`, {
    paymentSummary: computeSummary(totalFees, newAmountPaid),
    updatedAt: new Date(),
  });

  try {
    await writeAuditLog({
      action: "delete",
      entityType: "summerClubPayment",
      entityId: payment.id,
      userId,
      userName,
      changes: { amount: { from: payment.amount, to: 0 } },
    });
  } catch (e) {
    console.warn("[summer-club] audit failed:", e);
  }
}
