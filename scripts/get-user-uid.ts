// Get user UID by email and create admin document
// Run with: npx tsx scripts/get-user-uid.ts

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
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";

async function getUserAndCreateDoc() {
  console.log("🔍 Getting Dr. Ahmed's UID and creating admin document...\n");

  try {
    // Sign in as admin to get token
    console.log("🔐 Signing in as admin...");
    const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = await adminCred.user.getIdToken();
    console.log("✅ Admin signed in\n");

    // Use Identity Toolkit to lookup user by email
    console.log(`📧 Looking up user: ${DR_AHMED_EMAIL}...`);

    const lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: [DR_AHMED_EMAIL] }),
      }
    );

    if (!lookupResponse.ok) {
      const error = await lookupResponse.json();
      throw new Error(`Lookup failed: ${error.error?.message || "Unknown error"}`);
    }

    const lookupData = await lookupResponse.json();

    if (!lookupData.users || lookupData.users.length === 0) {
      throw new Error("User not found in Firebase Auth");
    }

    const user = lookupData.users[0];
    const uid = user.localId;

    console.log(`✅ Found user!`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified || false}\n`);

    // Create Firestore document
    console.log("📝 Creating admin document in Firestore...");

    const now = new Date().toISOString();
    const userDoc = {
      fields: {
        email: { stringValue: DR_AHMED_EMAIL },
        displayName: { stringValue: "Dr. Ahmed" },
        role: { stringValue: "admin" },
        phone: { stringValue: "" },
        monthlyTarget: { integerValue: "0" },
        isActive: { booleanValue: true },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    };

    const firestoreUrl = `${BASE}/users/${uid}`;
    const firestoreResponse = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDoc),
    });

    if (!firestoreResponse.ok) {
      const firestoreError = await firestoreResponse.json();
      throw new Error(
        `Firestore write failed: ${firestoreError.error?.message || "Unknown error"}`
      );
    }

    console.log("✅ Admin document created successfully!\n");

    console.log("=" .repeat(60));
    console.log("🎉 DR. AHMED ADMIN ACCOUNT READY!");
    console.log("=".repeat(60));
    console.log("\n📋 Account Details:");
    console.log(`   Email:    ${DR_AHMED_EMAIL}`);
    console.log(`   Name:     Dr. Ahmed`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
    console.log("\n📧 IMPORTANT:");
    console.log("   A password reset email has been sent to:");
    console.log(`   ${DR_AHMED_EMAIL}`);
    console.log("\n   Please:");
    console.log("   1. Check your email");
    console.log("   2. Click the reset link");
    console.log("   3. Set your new password");
    console.log("\n🌐 Then login at:");
    console.log("   https://langford-system.vercel.app/login");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

getUserAndCreateDoc();
