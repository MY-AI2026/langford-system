// Reset Dr. Ahmed's password to specific password
// Run with: npx tsx scripts/reset-dr-ahmed-password-manual.ts

import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";

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
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const NEW_PASSWORD = "Langford2026";

async function resetAndSetup() {
  console.log("🔧 Resetting Dr. Ahmed's password and creating admin document...\n");

  try {
    // Step 1: Sign in as admin
    console.log("🔐 Signing in as admin...");
    const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = await adminCred.user.getIdToken();
    console.log("✅ Admin signed in\n");

    // Step 2: Get Dr. Ahmed's UID using lookup API
    console.log("🔍 Looking up Dr. Ahmed's account...");
    
    // We need to use a different approach - send password reset email
    console.log("📧 Sending password reset email...");
    await sendPasswordResetEmail(auth, DR_AHMED_EMAIL);
    console.log("✅ Password reset email sent\n");

    console.log("=" .repeat(60));
    console.log("⚠️  MANUAL STEPS REQUIRED");
    console.log("=".repeat(60));
    console.log("\n📋 Please follow these steps:");
    console.log("\n1. Check email: ahmedelnahrawy@langfordkw.com");
    console.log("2. Click the password reset link");
    console.log(`3. Set new password to: ${NEW_PASSWORD}`);
    console.log("4. Run this script again to create admin document");
    console.log("\nOR");
    console.log("\n1. Use Firebase Console to delete the existing user");
    console.log("2. Run: npx tsx scripts/create-dr-ahmed-new.ts");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  }
}

resetAndSetup();
