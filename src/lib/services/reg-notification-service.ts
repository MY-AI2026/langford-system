/**
 * Registration module — admin notifications (in-app inbox).
 *
 * PR #1 scope:
 *   - `emitNewStudentNotification` writes the in-app row when a student is
 *     registered. The row is consumed by the admin notification drawer
 *     (built in PR #3).
 *   - `subscribeToAdminNotifications` powers that drawer via polling.
 *
 * Email delivery (Resend + Cloud Function on Firestore trigger) lands in PR #4
 * and populates `emailSent` / `emailSentAt` on the same row — no schema change
 * needed there.
 */

import {
  RegNotification,
  RegNotificationType,
  RegAuditEntityType,
  RegStudent,
} from "@/lib/types";
import {
  restCreate,
  restUpdate,
  runQuery,
  createSubscription,
} from "@/lib/firebase/rest-helpers";
import { REG_ROUTES } from "@/lib/registration/constants";

const COLLECTION = "regNotifications";

/**
 * Emit an in-app notification for the admin when an agent registers a
 * student. Best-effort: failure is logged but does NOT roll back the
 * student create (the audit log + Firestore listener provide redundancy).
 */
export async function emitNewStudentNotification(student: RegStudent): Promise<void> {
  try {
    await restCreate(COLLECTION, {
      type: "new_student" satisfies RegNotificationType,
      recipientRole: "admin",
      recipientUid: null,
      title: `طالب جديد: ${student.fullName}`,
      body: `${student.createdByName} سجّل ${student.fullName} في كورس ${student.courseName}`,
      link: REG_ROUTES.adminStudents,
      entityType: "regStudent" satisfies RegAuditEntityType,
      entityId: student.id,
      isRead: false,
      readAt: null,
      readBy: null,
      emailSent: false,
      emailSentAt: null,
      emailRecipients: [],
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn("[reg-notification] emit failed (non-blocking):", e);
  }
}

/** Admin notification drawer — polls every 15s for new entries. */
export function subscribeToAdminNotifications(
  callback: (notifications: RegNotification[]) => void,
  options: { limit?: number; unreadOnly?: boolean } = {}
): () => void {
  const limit = options.limit ?? 50;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFilters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: "recipientRole" },
        op: "EQUAL",
        value: { stringValue: "admin" },
      },
    },
  ];
  if (options.unreadOnly) {
    whereFilters.push({
      fieldFilter: {
        field: { fieldPath: "isRead" },
        op: "EQUAL",
        value: { booleanValue: false },
      },
    });
  }

  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
    where:
      whereFilters.length === 1
        ? whereFilters[0]
        : { compositeFilter: { op: "AND", filters: whereFilters } },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit,
  };

  return createSubscription<RegNotification>(
    async () => {
      try {
        return (await runQuery(structuredQuery)) as RegNotification[];
      } catch (e) {
        console.error("[reg-notification] subscribe failed:", e);
        return [];
      }
    },
    callback,
    15000
  );
}

/** Mark a notification as read. Caller passes the reading admin's uid. */
export async function markNotificationRead(
  notificationId: string,
  adminUid: string
): Promise<void> {
  await restUpdate(`${COLLECTION}/${notificationId}`, {
    isRead: true,
    readAt: new Date(),
    readBy: adminUid,
  });
}

/** Bulk mark — used by the "Mark all as read" button in the admin drawer. */
export async function markAllNotificationsRead(
  notificationIds: string[],
  adminUid: string
): Promise<void> {
  await Promise.all(
    notificationIds.map((id) =>
      markNotificationRead(id, adminUid).catch((e) =>
        console.warn(`[reg-notification] mark-read ${id} failed:`, e)
      )
    )
  );
}
