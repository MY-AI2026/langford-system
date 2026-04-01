import { auth } from "./config";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export { BASE, PROJECT_ID };

export async function getToken(): Promise<string> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  return auth.currentUser.getIdToken();
}

// ─── JS → Firestore REST value conversions ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object" && value !== null) {
    // Firestore Timestamp-like object
    if ("toDate" in value && typeof (value as Record<string, unknown>).toDate === "function") {
      return { timestampValue: ((value as { toDate: () => Date }).toDate()).toISOString() };
    }
    // Already in Firestore REST format
    if (
      "stringValue" in value ||
      "integerValue" in value ||
      "booleanValue" in value ||
      "timestampValue" in value ||
      "nullValue" in value ||
      "doubleValue" in value ||
      "arrayValue" in value ||
      "mapValue" in value
    ) {
      return value as Record<string, unknown>;
    }
    // Regular object → mapValue
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function toFirestoreFields(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "id") continue; // Skip document ID
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

/** REST CREATE — equivalent to addDoc. Returns the new document ID. */
export async function restCreate(
  collectionPath: string,
  data: Record<string, unknown>
): Promise<string> {
  const token = await getToken();
  const url = `${BASE}/${collectionPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `REST create failed: ${res.status}`
    );
  }
  const result = await res.json();
  return (result.name as string)?.split("/").pop() || "";
}

/** REST UPDATE — equivalent to updateDoc */
export async function restUpdate(
  documentPath: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = await getToken();
  const fields = toFirestoreFields(data);
  const fieldPaths = Object.keys(fields)
    .map(encodeURIComponent)
    .join("&updateMask.fieldPaths=");
  const url = `${BASE}/${documentPath}?updateMask.fieldPaths=${fieldPaths}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `REST update failed: ${res.status}`
    );
  }
}

/** REST DELETE — equivalent to deleteDoc */
export async function restDelete(documentPath: string): Promise<void> {
  const token = await getToken();
  const url = `${BASE}/${documentPath}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`REST delete failed: ${res.status}`);
  }
}

/** REST SET — equivalent to setDoc (creates or overwrites) */
export async function restSet(
  documentPath: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = await getToken();
  const url = `${BASE}/${documentPath}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `REST set failed: ${res.status}`
    );
  }
}

// Parse a single Firestore REST value to JS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseValue(val: any): any {
  if (val === undefined || val === null) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val)
    return {
      toDate: () => new Date(val.timestampValue),
      seconds: Math.floor(new Date(val.timestampValue).getTime() / 1000),
    };
  if ("arrayValue" in val)
    return (val.arrayValue.values || []).map(parseValue);
  if ("mapValue" in val) return parseFields(val.mapValue.fields || {});
  if ("referenceValue" in val) return val.referenceValue;
  return null;
}

// Parse Firestore fields object to plain JS object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFields(fields: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseValue(val);
  }
  return result;
}

// Fetch a collection via structuredQuery (supports orderBy)
export async function fetchCollection(
  path: string,
  orderByField?: string,
  direction?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const token = await getToken();
  const parentPath = path.includes("/")
    ? path.substring(0, path.lastIndexOf("/"))
    : "";
  const collectionId = path.includes("/")
    ? path.substring(path.lastIndexOf("/") + 1)
    : path;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    structuredQuery: {
      from: [{ collectionId }],
    },
  };

  if (orderByField) {
    body.structuredQuery.orderBy = [
      {
        field: { fieldPath: orderByField },
        direction: direction || "DESCENDING",
      },
    ];
  }

  const url = parentPath ? `${BASE}/${parentPath}:runQuery` : `${BASE}:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[REST] fetchCollection ${path} failed:`, res.status);
    return [];
  }

  const results = await res.json();
  return results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r.document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => ({
      id: r.document.name.split("/").pop(),
      ...parseFields(r.document.fields || {}),
    }));
}

// Run a structuredQuery with full control (filters, orderBy, limit, collectionGroup)
export async function runQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredQuery: any,
  parentPath: string = ""
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const token = await getToken();
  const url = parentPath ? `${BASE}/${parentPath}:runQuery` : `${BASE}:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`[REST] runQuery failed:`, res.status, errorText);
    // Check if it's an index error
    if (errorText.includes("index") || errorText.includes("FAILED_PRECONDITION")) {
      console.error("[REST] Missing Firestore index. Please check Firestore console for index creation link.");
    }
    return [];
  }

  try {
    const results = await res.json();
    if (!Array.isArray(results)) {
      console.error("[REST] runQuery: unexpected response format");
      return [];
    }
    return results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.document)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({
        id: r.document.name.split("/").pop(),
        ...parseFields(r.document.fields || {}),
      }));
  } catch (error) {
    console.error("[REST] runQuery: error parsing results", error);
    return [];
  }
}

// Fetch a single document
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchDoc(path: string): Promise<any | null> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.fields) return null;
  return { id: json.name.split("/").pop(), ...parseFields(json.fields) };
}

// Create a polling subscription (replaces onSnapshot)
export function createSubscription<T>(
  fetchFn: () => Promise<T[]>,
  callback: (data: T[]) => void,
  intervalMs: number = 10000
): () => void {
  let active = true;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function poll() {
    if (!active) return;
    try {
      const data = await fetchFn();
      if (active) callback(data);
    } catch (e) {
      console.error("[REST subscription] poll error:", e);
    }
  }

  // Initial fetch
  poll();
  // Poll every intervalMs
  timer = setInterval(poll, intervalMs);

  return () => {
    active = false;
    if (timer) clearInterval(timer);
  };
}
