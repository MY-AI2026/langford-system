// Initial setup script - Run ONCE to set up the system
// Run with: npx tsx scripts/initial-setup.ts

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, Timestamp } from "firebase/firestore";

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
const db = getFirestore(app);

// Admin credentials
const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Langford@2025";

// All 24 courses
const COURSES = [
  // General English Courses
  { name: "General English (Starter 1)", category: "general_english", level: "Starter 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Starter 2)", category: "general_english", level: "Starter 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Elementary 1)", category: "general_english", level: "Elementary 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Elementary 2)", category: "general_english", level: "Elementary 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Pre-Intermediate 1)", category: "general_english", level: "Pre-Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Pre-Intermediate 2)", category: "general_english", level: "Pre-Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Intermediate 1)", category: "general_english", level: "Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Intermediate 2)", category: "general_english", level: "Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Upper-Intermediate 1)", category: "general_english", level: "Upper-Intermediate 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Upper-Intermediate 2)", category: "general_english", level: "Upper-Intermediate 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Advanced 1)", category: "general_english", level: "Advanced 1", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },
  { name: "General English (Advanced 2)", category: "general_english", level: "Advanced 2", duration: "8 weeks", defaultFees: 150, maxStudents: 20 },

  // Exam Preparation
  { name: "IELTS Preparation", category: "exam_prep", level: "Intermediate+", duration: "12 weeks", defaultFees: 200, maxStudents: 15 },
  { name: "TOEFL Preparation", category: "exam_prep", level: "Intermediate+", duration: "12 weeks", defaultFees: 200, maxStudents: 15 },

  // Professional Courses
  { name: "ESP (English for Specific Purposes)", category: "professional", level: "Intermediate+", duration: "10 weeks", defaultFees: 180, maxStudents: 15 },
  { name: "Accounting English", category: "professional", level: "Intermediate", duration: "8 weeks", defaultFees: 170, maxStudents: 15 },
  { name: "Management English", category: "professional", level: "Intermediate+", duration: "8 weeks", defaultFees: 170, maxStudents: 15 },
  { name: "HR English", category: "professional", level: "Intermediate", duration: "8 weeks", defaultFees: 170, maxStudents: 15 },
  { name: "AI & Technology English", category: "professional", level: "Intermediate+", duration: "8 weeks", defaultFees: 180, maxStudents: 15 },

  // Diplomas
  { name: "PCD Diploma", category: "diploma", level: "All Levels", duration: "6 months", defaultFees: 500, maxStudents: 25 },
  { name: "Speak Smart Diploma (Elementary)", category: "diploma", level: "Elementary", duration: "4 months", defaultFees: 350, maxStudents: 20 },
  { name: "Speak Smart Diploma (Intermediate)", category: "diploma", level: "Intermediate", duration: "4 months", defaultFees: 350, maxStudents: 20 },

  // Other Courses
  { name: "Conversation Course", category: "other", level: "All Levels", duration: "6 weeks", defaultFees: 120, maxStudents: 20 },
  { name: "School Support", category: "other", level: "School Age", duration: "Ongoing", defaultFees: 100, maxStudents: 15 },
];

async function setupSystem() {
  console.log("🚀 Starting Langford System Initial Setup...\n");

  try {
    // Step 1: Create Admin User
    console.log("📧 Creating admin user in Firebase Auth...");
    let adminUid: string;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      adminUid = userCredential.user.uid;
      console.log("✅ Admin user created in Firebase Auth");
      console.log(`   UID: ${adminUid}`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        console.log("ℹ️  Admin user already exists in Firebase Auth");
        // If user exists, we can't get the UID easily, so we'll skip the user doc creation
        // The user will need to run create-admin.ts separately if they need to update the doc
        console.log("   Please run: npx tsx scripts/create-admin.ts");
        adminUid = "skip";
      } else {
        throw error;
      }
    }

    // Step 2: Create User Document in Firestore
    if (adminUid !== "skip") {
      console.log("\n📝 Creating admin user document in Firestore...");
      await setDoc(doc(db, "users", adminUid), {
        email: ADMIN_EMAIL,
        displayName: "Admin",
        role: "admin",
        phone: "",
        monthlyTarget: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log("✅ Admin user document created");
    }

    // Step 3: Create Default Settings
    console.log("\n⚙️  Creating default system settings...");
    await setDoc(doc(db, "settings", "general"), {
      leadSources: [
        "Walk-in",
        "Phone Inquiry",
        "Social Media",
        "Website",
        "Referral",
        "Sponsor",
        "Exhibition",
        "Other"
      ],
      levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
      paymentMethods: ["cash", "card", "bank_transfer", "online"],
      defaultCurrency: "KWD",
      instituteName: "Langford International Institute",
      institutePhone: "+965 XXXX XXXX",
      instituteAddress: "Kuwait City, Kuwait",
    });
    console.log("✅ Default settings created");

    // Step 4: Seed All 24 Courses
    console.log("\n📚 Seeding 24 courses...");
    const now = Timestamp.now();
    let courseCount = 0;

    for (const course of COURSES) {
      const courseRef = doc(collection(db, "courses"));
      await setDoc(courseRef, {
        name: course.name,
        description: `${course.name} - Professional English course at Langford International Institute`,
        category: course.category,
        duration: course.duration,
        level: course.level,
        defaultFees: course.defaultFees,
        maxStudents: course.maxStudents,
        instructorId: "",
        instructorName: "",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      courseCount++;
      process.stdout.write(`\r   Progress: ${courseCount}/${COURSES.length} courses created`);
    }
    console.log("\n✅ All 24 courses seeded successfully");

    // Success Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SETUP COMPLETE! System is ready to use.");
    console.log("=".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log("\n🌐 Access your system at:");
    console.log("   https://langford-system.vercel.app");
    console.log("\n✨ What's been set up:");
    console.log("   ✅ Admin user account");
    console.log("   ✅ System settings");
    console.log("   ✅ 24 courses (General English, IELTS, TOEFL, ESP, Diplomas, etc.)");
    console.log("\n💡 Next steps:");
    console.log("   1. Log in with the credentials above");
    console.log("   2. Go to Settings → Users to create more users");
    console.log("   3. Start adding students!");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

setupSystem();
