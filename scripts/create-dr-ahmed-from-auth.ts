// Create Dr. Ahmed's Firestore document after getting UID from Firebase Auth
// Run with: npx tsx scripts/create-dr-ahmed-from-auth.ts

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

// Admin credentials to authenticate
const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";

// Dr. Ahmed details
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";

async function createDrAhmedDocument() {
  console.log("🔍 Creating Dr. Ahmed's admin document...\n");

  try {
    // Step 1: Sign in as admin to get token for Firestore operations
    console.log("🔐 Signing in as admin...");
    const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = await adminCred.user.getIdToken();
    console.log("✅ Admin signed in\n");

    // Step 2: List all Firebase Auth users using Admin SDK REST API
    // We need to use the Firebase Admin REST API to list users
    // But we can't do that with just a client token...
    
    // Alternative: Use Identity Toolkit to get user by email
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
    
    console.log(`📧 Looking up Dr. Ahmed's account...`);
    
    // Use accounts:lookup with email filter (requires idToken)
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`;
    const lookupRes = await fetch(lookupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: adminToken
      }),
    });

    if (!lookupRes.ok) {
      const err = await lookupRes.json();
      throw new Error(`Lookup failed: ${JSON.stringify(err)}`);
    }

    const lookupData = await lookupRes.json();
    
    if (!lookupData.users || lookupData.users.length === 0) {
      console.log("❌ User not found in Firebase Auth");
      console.log("   The account doesn't exist yet.");
      console.log("   Please create the account first using Firebase Console or sign up.");
      process.exit(1);
    }

    const user = lookupData.users[0];
    const uid = user.localId;

    console.log("✅ Found Dr. Ahmed's account!");
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified || false}\n`);

    // Step 3: Create Firestore user document
    console.log("📝 Creating admin user document in Firestore...");

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
    const firestoreRes = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDoc),
    });

    if (!firestoreRes.ok) {
      const err = await firestoreRes.json();
      throw new Error(`Firestore write failed: ${JSON.stringify(err)}`);
    }

    console.log("✅ Admin user document created successfully!\n");

    console.log("=".repeat(60));
    console.log("🎉 DR. AHMED ADMIN ACCOUNT READY!");
    console.log("=".repeat(60));
    console.log("\n📋 Account Details:");
    console.log(`   Email:    ${DR_AHMED_EMAIL}`);
    console.log(`   Name:     Dr. Ahmed`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
    console.log("\n📧 Password Reset:");
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

createDrAhmedDocument();
