"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { User, UserRole } from "@/lib/types";

// ─── Firestore REST API — zero SDK, zero WebSocket, works 100% on Vercel ───
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

interface FirestoreField {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: string;
}

async function fetchUserDoc(firebaseUser: FirebaseUser): Promise<User | null> {
  try {
    const token = await firebaseUser.getIdToken(/* forceRefresh */ false);
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${firebaseUser.uid}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.fields) return null;

    const fields = json.fields as Record<string, FirestoreField>;
    const get = (k: string) => {
      const v = fields[k];
      if (!v) return undefined;
      if ("stringValue" in v) return v.stringValue;
      if ("booleanValue" in v) return v.booleanValue;
      if ("integerValue" in v) return Number(v.integerValue);
      if ("doubleValue" in v) return v.doubleValue;
      return undefined;
    };

    return {
      uid: firebaseUser.uid,
      email: (get("email") as string) ?? firebaseUser.email ?? "",
      displayName: (get("displayName") as string) ?? firebaseUser.displayName ?? "",
      role: (get("role") as UserRole) ?? "sales",
      phone: get("phone") as string | undefined,
      monthlyTarget: (get("monthlyTarget") as number) ?? 0,
      isActive: (get("isActive") as boolean) ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: fields.createdAt as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: fields.updatedAt as any,
    };
  } catch (e) {
    console.error("[auth-context] fetchUserDoc failed:", e);
    return null;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  role: UserRole | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userData: null,
  role: null,
  loading: true,
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser(fbUser: FirebaseUser) {
    setLoading(true);
    const data = await fetchUserDoc(fbUser);
    setUserData(data);
    setRole(data?.role ?? null);
    setLoading(false);
  }

  async function refreshUserData() {
    if (!firebaseUser) return;
    await loadUser(firebaseUser);
  }

  useEffect(() => {
    let active = true;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;

      setFirebaseUser(fbUser);

      if (fbUser) {
        await loadUser(fbUser);
      } else {
        setUserData(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userData, role, loading, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
