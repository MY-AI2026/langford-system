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
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 1. List instructor users
  console.log("=== INSTRUCTORS ===");
  const usersRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "users" }] } }),
  });
  const usersData = await usersRes.json();
  const instructors = usersData.filter((r: any) => r.document && r.document.fields?.role?.stringValue === "instructor")
    .map((r: any) => ({
      uid: r.document.name.split("/").pop(),
      name: r.document.fields?.displayName?.stringValue,
      email: r.document.fields?.email?.stringValue,
    }));
  if (instructors.length === 0) console.log("  ❌ NO INSTRUCTORS in the system");
  else instructors.forEach((i: any) => console.log(`  ✅ ${i.name} (${i.email}) — uid=${i.uid}`));

  // 2. Enrollment details with instructor info
  console.log("\n=== ENROLLMENTS WITH INSTRUCTOR FIELDS ===");
  const enrRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "enrollments", allDescendants: true }] },
    }),
  });
  const enrData = await enrRes.json();
  enrData.filter((r: any) => r.document).forEach((r: any) => {
    const f = r.document.fields || {};
    console.log(`  course="${f.courseName?.stringValue}" instructorId="${f.instructorId?.stringValue || "EMPTY"}" instructorName="${f.instructorName?.stringValue || "EMPTY"}"`);
  });

  // 3. Courses with instructor fields
  console.log("\n=== COURSES WITH INSTRUCTOR FIELDS ===");
  const coursesRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "courses" }] } }),
  });
  const coursesData = await coursesRes.json();
  const withInstructor = coursesData.filter((r: any) => r.document && r.document.fields?.instructorId?.stringValue)
    .map((r: any) => ({
      name: r.document.fields?.name?.stringValue,
      instructorId: r.document.fields?.instructorId?.stringValue,
      instructorName: r.document.fields?.instructorName?.stringValue,
    }));
  if (withInstructor.length === 0) console.log("  ❌ NO COURSES have instructorId set");
  else withInstructor.forEach((c: any) => console.log(`  ✅ "${c.name}" → ${c.instructorName} (${c.instructorId})`));

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
