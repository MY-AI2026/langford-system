import type { Timestamp } from "firebase/firestore";
import { User, UserRole } from "@/lib/types";
import {
  fetchCollection,
  fetchDoc,
  runQuery,
  createSubscription,
  restSet,
  restUpdate,
  restDelete,
  restCreate,
} from "@/lib/firebase/rest-helpers";

// ─── Public API ──────────────────────────────────────────────────────────────

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  return createSubscription<User>(
    async () => {
      const results = await fetchCollection("users", "createdAt", "DESCENDING");
      // Map id -> uid for User type
      return results.map((r) => ({ ...r, uid: r.id })) as User[];
    },
    callback,
    5000
  );
}

export async function getUser(uid: string): Promise<User | null> {
  const result = await fetchDoc(`users/${uid}`);
  if (!result) return null;
  return { ...result, uid: result.id } as User;
}

export async function getSalesUsers(): Promise<User[]> {
  const results = await fetchCollection("users");
  return results
    .map((r) => ({ ...r, uid: r.id }) as User)
    .filter((u) => u.role === "sales" && u.isActive !== false);
}

export async function getAllUsers(): Promise<User[]> {
  const results = await fetchCollection("users");
  return results.map((r) => ({ ...r, uid: r.id }) as User);
}

export async function createUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  monthlyTarget?: number;
}): Promise<string> {
  // Use Identity Toolkit REST API to create the Firebase Auth account
  // WITHOUT signing in as the new user (avoids logging out the current admin)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        returnSecureToken: false,
      }),
    }
  );

  if (!signUpRes.ok) {
    const err = await signUpRes.json();
    const msg = (err as { error?: { message?: string } }).error?.message ?? "Failed to create auth account";
    throw new Error(msg);
  }

  const { localId: uid } = (await signUpRes.json()) as { localId: string };

  const now = new Date();
  await restSet(`users/${uid}`, {
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    phone: data.phone || "",
    monthlyTarget: data.monthlyTarget || 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return uid;
}

export async function updateUser(
  uid: string,
  data: Partial<{
    displayName: string;
    role: UserRole;
    phone: string;
    monthlyTarget: number;
    isActive: boolean;
  }>
) {
  await restUpdate(`users/${uid}`, { ...data, updatedAt: new Date() });
}

export async function deleteUser(uid: string) {
  await restDelete(`users/${uid}`);
}

export async function logUserLogin(uid: string, userName: string, email: string) {
  await restCreate("loginLogs", {
    userId: uid,
    userName,
    email,
    loginAt: new Date(),
  });
}

/** REST-based polling subscription to login logs */
export function subscribeToLoginLogs(
  callback: (logs: Array<{
    id: string;
    userId: string;
    userName: string;
    email: string;
    loginAt: Timestamp;
  }>) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "loginLogs" }],
    orderBy: [
      { field: { fieldPath: "loginAt" }, direction: "DESCENDING" },
    ],
    limit: 200,
  };

  return createSubscription(
    async () => {
      const results = await runQuery(structuredQuery);
      return results.map((r) => ({
        id: r.id as string,
        userId: (r.userId as string) ?? "",
        userName: (r.userName as string) ?? "",
        email: (r.email as string) ?? "",
        loginAt: r.loginAt as Timestamp,
      }));
    },
    callback,
    5000
  );
}
