/**
 * Registration module — Acceptix agent administration (client side).
 *
 * Write operations (create, toggle active, reset password) are not done
 * directly against Firestore — they go through Cloud Functions so we can:
 *   1. Use the Admin SDK to mutate Firebase Auth atomically alongside the
 *      Firestore record.
 *   2. Validate caller permissions server-side regardless of UI tampering.
 *   3. Roll back the Auth user if the Firestore write fails (avoids
 *      orphan login accounts).
 *
 * Read operations (list agents, count their students) talk to Firestore
 * directly via the existing REST helpers.
 */

import { User, UserRole } from "@/lib/types";
import {
  runQuery,
  createSubscription,
} from "@/lib/firebase/rest-helpers";
import {
  callCreateAcceptixAgent,
  callToggleAgentActive,
  callResetAgentPassword,
  CreateAgentPayload,
} from "@/lib/firebase/functions";

const ACCEPTIX_ROLE: UserRole = "acceptix_agent";

// ─── Read API ────────────────────────────────────────────────────────────────

/** Subscribe to the full Acceptix agent roster (active + disabled). */
export function subscribeToAcceptixAgents(
  callback: (agents: User[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "users" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "role" },
        op: "EQUAL",
        value: { stringValue: ACCEPTIX_ROLE },
      },
    },
  };

  return createSubscription<User>(
    async () => {
      try {
        const rows = (await runQuery(structuredQuery)) as User[];
        // Normalize a `uid` field on each (Firestore docs use `id` from
        // restCollection, but the User type uses `uid`).
        return rows.map((r) => ({
          ...r,
          uid: (r as unknown as { id: string }).id,
        }));
      } catch (e) {
        console.error("[reg-agent] subscribe failed:", e);
        return [];
      }
    },
    callback,
    10000
  );
}

// ─── Write API (Cloud Functions) ─────────────────────────────────────────────

/**
 * Create a new Acceptix agent. Returns the new user's uid + email.
 * Throws on validation errors or duplicates — the caller surfaces the
 * Arabic error message from the function response.
 */
export async function createAcceptixAgent(
  input: CreateAgentPayload
): Promise<{ uid: string; email: string; fullName: string }> {
  const res = await callCreateAcceptixAgent(input);
  return res.data;
}

export async function setAgentActive(
  uid: string,
  isActive: boolean
): Promise<void> {
  await callToggleAgentActive({ uid, isActive });
}

export async function resetAgentPassword(
  uid: string,
  password: string
): Promise<void> {
  await callResetAgentPassword({ uid, password });
}
