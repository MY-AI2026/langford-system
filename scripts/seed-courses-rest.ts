// Seed 24 courses using REST API (must be logged in as admin first)
// Run with: npx tsx scripts/seed-courses-rest.ts

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

// Admin credentials
const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";

// All 24 courses
const COURSES = [
  // General English Courses
  { name: "General English (Starter 1)", category: "general_english", level: "Starter 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Beginner level English course for absolute beginners" },
  { name: "General English (Starter 2)", category: "general_english", level: "Starter 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Starter 1 level" },
  { name: "General English (Elementary 1)", category: "general_english", level: "Elementary 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Elementary level English for basic communication" },
  { name: "General English (Elementary 2)", category: "general_english", level: "Elementary 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Elementary 1 level" },
  { name: "General English (Pre-Intermediate 1)", category: "general_english", level: "Pre-Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Pre-intermediate level for developing language skills" },
  { name: "General English (Pre-Intermediate 2)", category: "general_english", level: "Pre-Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Pre-Intermediate 1 level" },
  { name: "General English (Intermediate 1)", category: "general_english", level: "Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Intermediate level for confident communication" },
  { name: "General English (Intermediate 2)", category: "general_english", level: "Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Intermediate 1 level" },
  { name: "General English (Upper-Intermediate 1)", category: "general_english", level: "Upper-Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Upper-intermediate level for advanced communication" },
  { name: "General English (Upper-Intermediate 2)", category: "general_english", level: "Upper-Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Upper-Intermediate 1 level" },
  { name: "General English (Advanced 1)", category: "general_english", level: "Advanced 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Advanced level English for fluent speakers" },
  { name: "General English (Advanced 2)", category: "general_english", level: "Advanced 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20, description: "Continuation of Advanced 1 level" },

  // Exam Preparation
  { name: "IELTS Preparation", category: "exam_prep", level: "Intermediate+", duration: "12 weeks", defaultFees: 200, maxStudents: 15, description: "Comprehensive IELTS exam preparation course" },
  { name: "TOEFL Preparation", category: "exam_prep", level: "Intermediate+", duration: "12 weeks", defaultFees: 200, maxStudents: 15, description: "Comprehensive TOEFL exam preparation course" },

  // Professional Courses
  { name: "ESP (English for Specific Purposes)", category: "professional", level: "Intermediate+", duration: "10 weeks", defaultFees: 180, maxStudents: 15, description: "English for specific professional contexts" },
  { name: "Accounting English", category: "professional", level: "Intermediate", duration: "8 weeks", defaultFees: 170, maxStudents: 15, description: "English for accounting professionals" },
  { name: "Management English", category: "professional", level: "Intermediate+", duration: "8 weeks", defaultFees: 170, maxStudents: 15, description: "English for managers and business leaders" },
  { name: "HR English", category: "professional", level: "Intermediate", duration: "8 weeks", defaultFees: 170, maxStudents: 15, description: "English for human resources professionals" },
  { name: "AI & Technology English", category: "professional", level: "Intermediate+", duration: "8 weeks", defaultFees: 180, maxStudents: 15, description: "English for AI and technology professionals" },

  // Diplomas
  { name: "PCD Diploma", category: "diploma", level: "All Levels", duration: "6 months", defaultFees: 500, maxStudents: 25, description: "Professional Certificate Diploma in English" },
  { name: "Speak Smart Diploma (Elementary)", category: "diploma", level: "Elementary", duration: "4 months", defaultFees: 350, maxStudents: 20, description: "Speak Smart Diploma for elementary level students" },
  { name: "Speak Smart Diploma (Intermediate)", category: "diploma", level: "Intermediate", duration: "4 months", defaultFees: 350, maxStudents: 20, description: "Speak Smart Diploma for intermediate level students" },

  // Other Courses
  { name: "Conversation Course", category: "other", level: "All Levels", duration: "6 weeks", defaultFees: 120, maxStudents: 20, description: "Focused conversation practice course" },
  { name: "School Support", category: "other", level: "School Age", duration: "Ongoing", defaultFees: 100, maxStudents: 15, description: "English support for school-age students" },
];

async function seedCourses() {
  console.log("🚀 Seeding 24 Courses using REST API...\n");

  try {
    // Step 1: Sign in as admin
    console.log("🔐 Signing in as admin...");
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const token = await userCredential.user.getIdToken();
    console.log("✅ Signed in successfully\n");

    // Step 2: Seed all courses
    console.log("📚 Creating 24 courses...");
    const now = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < COURSES.length; i++) {
      const course = COURSES[i];

      try {
        const fields = {
          name: { stringValue: course.name },
          description: { stringValue: course.description },
          category: { stringValue: course.category },
          duration: { stringValue: course.duration },
          level: { stringValue: course.level },
          defaultFees: { doubleValue: course.defaultFees },
          maxStudents: { integerValue: String(course.maxStudents) },
          instructorId: { stringValue: "" },
          instructorName: { stringValue: "" },
          isActive: { booleanValue: true },
          createdAt: { timestampValue: now },
          updatedAt: { timestampValue: now },
        };

        const url = `${BASE}/courses`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        successCount++;
        process.stdout.write(`\r   Progress: ${i + 1}/${COURSES.length} - ✅ ${successCount} success, ❌ ${failCount} failed`);
      } catch (error: any) {
        failCount++;
        console.error(`\n   ❌ Failed to create "${course.name}":`, error.message);
      }
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("🎉 SEEDING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n✅ Successfully created: ${successCount}/${COURSES.length} courses`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount}/${COURSES.length} courses`);
    }

    console.log("\n📋 Course Categories:");
    console.log("   • General English: 12 levels");
    console.log("   • Exam Prep: IELTS, TOEFL");
    console.log("   • Professional: ESP, Accounting, Management, HR, AI");
    console.log("   • Diplomas: PCD, Speak Smart (Elementary & Intermediate)");
    console.log("   • Other: Conversation, School Support");

    console.log("\n🌐 View courses at:");
    console.log("   https://langford-system.vercel.app/settings/courses");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Seeding failed:", error.message);
    console.error("\nMake sure:");
    console.error("  1. Admin user exists (email: admin@langford.edu.kw)");
    console.error("  2. Password is correct (Langford@2025)");
    console.error("  3. Firestore rules allow authenticated writes");
    console.error("\n");
    process.exit(1);
  }
}

seedCourses();
