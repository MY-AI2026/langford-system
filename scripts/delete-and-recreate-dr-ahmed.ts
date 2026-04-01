// Delete old Dr. Ahmed account and create new one
// Run with: npx tsx scripts/delete-and-recreate-dr-ahmed.ts

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

const API_KEY = "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const PROJECT_ID = "langford-system";

const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const DR_AHMED_PASSWORD = "Langford2026";

async function deleteAndRecreate() {
  console.log("🔧 Deleting old account and creating new Dr. Ahmed admin...\n");

  try {
    // Step 1: Sign in as admin to get token
    console.log("🔐 Signing in as admin...");
    const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = await adminCred.user.getIdToken();
    console.log("✅ Admin signed in\n");

    // Step 2: Delete Dr. Ahmed's account
    console.log("🗑️  Attempting to delete old Dr. Ahmed account...");
    console.log("⚠️  Note: Deletion requires Firebase Admin SDK or Firebase Console");
    console.log("\n📋 MANUAL ACTION REQUIRED:");
    console.log("=" .repeat(60));
    console.log("\n1. Open Firebase Console:");
    console.log("   https://console.firebase.google.com/project/langford-system/authentication/users");
    console.log("\n2. Find user: ahmedelnahrawy@langfordkw.com");
    console.log("\n3. Click the 3 dots ⋮ → Delete User");
    console.log("\n4. Confirm deletion");
    console.log("\n5. Run this command:");
    console.log("   npx tsx scripts/create-dr-ahmed-new.ts");
    console.log("\n");
    console.log("=".repeat(60));
    console.log("\nOR use this direct link (requires login):");
    console.log("https://console.firebase.google.com/project/langford-system/authentication/users");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  }
}

deleteAndRecreate();
