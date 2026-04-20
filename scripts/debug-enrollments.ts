// Debug: show all courses and enrollments to find the mismatch
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

  // List all courses
  console.log("=== COURSES ===");
  const coursesRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "courses" }] } }),
  });
  const coursesData = await coursesRes.json();
  const courses = coursesData
    .filter((r: any) => r.document)
    .map((r: any) => ({
      id: r.document.name.split("/").pop(),
      name: r.document.fields?.name?.stringValue,
      isActive: r.document.fields?.isActive?.booleanValue,
      instructorId: r.document.fields?.instructorId?.stringValue || "",
      instructorName: r.document.fields?.instructorName?.stringValue || "",
    }));
  courses.forEach((c: any) => {
    console.log(`  [${c.id}] "${c.name}" active=${c.isActive} instructor=${c.instructorName || "—"}`);
  });

  // List all enrollments via collection group
  console.log("\n=== ENROLLMENTS (collection group) ===");
  const enrRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "enrollments", allDescendants: true }] },
    }),
  });
  const enrData = await enrRes.json();
  const enrollments = enrData
    .filter((r: any) => r.document)
    .map((r: any) => {
      const path = r.document.name.split("/");
      const studentIdx = path.indexOf("students");
      return {
        id: path[path.length - 1],
        studentId: path[studentIdx + 1],
        courseId: r.document.fields?.courseId?.stringValue,
        courseName: r.document.fields?.courseName?.stringValue,
        status: r.document.fields?.status?.stringValue,
      };
    });
  enrollments.forEach((e: any) => {
    const matchedCourse = courses.find((c: any) => c.id === e.courseId);
    console.log(`  studentId=${e.studentId} courseId=${e.courseId} courseName="${e.courseName}" status=${e.status}`);
    console.log(`    → matches course: ${matchedCourse ? `YES (${matchedCourse.name})` : "❌ NO MATCH"}`);
  });

  console.log(`\nTotal courses: ${courses.length}`);
  console.log(`Total enrollments: ${enrollments.length}`);
  console.log(`Active enrollments: ${enrollments.filter((e: any) => e.status === "active").length}`);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
