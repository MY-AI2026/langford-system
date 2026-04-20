// Test the EXACT query the attendance page makes
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const app = initializeApp({
  apiKey: "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps",
  authDomain: "langford-system.firebaseapp.com",
  projectId: "langford-system",
});
const auth = getAuth(app);
const BASE = `https://firestore.googleapis.com/v1/projects/langford-system/databases/(default)/documents`;

async function main() {
  const cred = await signInWithEmailAndPassword(auth, "admin@langford.edu.kw", "Admin@2025");
  const token = await cred.user.getIdToken();

  // Exact query from attendance page
  const courseId = "NPzgzc1swJKcznfAASzD"; // FATMA WALEED ABDULLAH course
  const structuredQuery = {
    from: [{ collectionId: "enrollments", allDescendants: true }],
    where: {
      fieldFilter: {
        field: { fieldPath: "courseId" },
        op: "EQUAL",
        value: { stringValue: courseId },
      },
    },
  };

  console.log("Testing attendance query for courseId:", courseId);
  console.log("Query:", JSON.stringify(structuredQuery, null, 2));

  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });

  console.log("\nResponse status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
