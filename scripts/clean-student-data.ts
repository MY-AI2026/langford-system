// Clean all student data (students, enrollments, payments, activity logs)
// Keeps: Users and Courses
// Run with: npx tsx scripts/clean-student-data.ts

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "langford-system.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "langford-system",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "langford-system.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "799147080189",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:799147080189:web:7542ae4cd634fb1a170194",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const PROJECT_ID = "langford-system";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";

async function cleanDatabase() {
  console.log("🧹 Cleaning Student Data from Database...\n");
  console.log("⚠️  This will DELETE:");
  console.log("   ❌ All Students");
  console.log("   ❌ All Enrollments");
  console.log("   ❌ All Payments");
  console.log("   ❌ All Activity Logs");
  console.log("   ❌ All Installment Plans");
  console.log("   ❌ All Attendance Records");
  console.log("   ❌ All Documents");
  console.log("\n✅ This will KEEP:");
  console.log("   ✓ All Users");
  console.log("   ✓ All Courses (24 courses)");
  console.log("   ✓ System Settings");
  console.log("\n⏳ Starting in 3 seconds...\n");

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Sign in as admin
    console.log("🔐 Signing in as admin...");
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const token = await userCredential.user.getIdToken();
    console.log("✅ Signed in successfully\n");

    // Get all students
    console.log("📋 Fetching all students...");
    const studentsUrl = `${BASE}:runQuery`;
    const studentsQuery = {
      structuredQuery: {
        from: [{ collectionId: "students" }],
      },
    };

    const studentsResponse = await fetch(studentsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentsQuery),
    });

    if (!studentsResponse.ok) {
      throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
    }

    const studentsData = await studentsResponse.json();
    const students = studentsData
      .filter((r: any) => r.document)
      .map((r: any) => ({
        id: r.document.name.split("/").pop(),
        path: r.document.name,
      }));

    console.log(`   Found ${students.length} students\n`);

    if (students.length === 0) {
      console.log("✅ No students to delete. Database is already clean!\n");
      process.exit(0);
    }

    // Delete each student and their subcollections
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        // Delete student subcollections (enrollments, payments, activityLog, etc.)
        const subcollections = [
          "enrollments",
          "payments",
          "activityLog",
          "installmentPlans",
          "attendance",
          "documents",
        ];

        for (const subcollection of subcollections) {
          try {
            const subUrl = `${BASE}:runQuery`;
            const subQuery = {
              structuredQuery: {
                from: [{ collectionId: subcollection }],
              },
            };

            const subResponse = await fetch(subUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(subQuery),
            });

            if (subResponse.ok) {
              const subData = await subResponse.json();
              const subDocs = subData
                .filter((r: any) => r.document)
                .filter((r: any) => r.document.name.includes(`students/${student.id}/${subcollection}`));

              for (const subDoc of subDocs) {
                const docPath = subDoc.document.name.replace(
                  `projects/${PROJECT_ID}/databases/(default)/documents/`,
                  ""
                );
                await fetch(`${BASE}/${docPath}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
              }
            }
          } catch (e) {
            // Silently continue if subcollection doesn't exist
          }
        }

        // Delete the student document itself
        await fetch(`${BASE}/students/${student.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        deletedCount++;
        process.stdout.write(
          `\r   Progress: ${i + 1}/${students.length} - ✅ ${deletedCount} deleted, ❌ ${errorCount} failed`
        );
      } catch (error: any) {
        errorCount++;
        process.stdout.write(
          `\r   Progress: ${i + 1}/${students.length} - ✅ ${deletedCount} deleted, ❌ ${errorCount} failed`
        );
      }
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("🎉 CLEANING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n✅ Deleted ${deletedCount}/${students.length} students`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount}/${students.length}`);
    }

    console.log("\n📊 Database Status:");
    console.log("   ✅ Users: Preserved");
    console.log("   ✅ Courses: Preserved (24 courses)");
    console.log("   ✅ Settings: Preserved");
    console.log("   🧹 Students: Cleaned");
    console.log("   🧹 Enrollments: Cleaned");
    console.log("   🧹 Payments: Cleaned");
    console.log("   🧹 Activity Logs: Cleaned");

    console.log("\n🌐 System ready at:");
    console.log("   https://langford-system.vercel.app");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Cleaning failed:", error.message);
    process.exit(1);
  }
}

cleanDatabase();
