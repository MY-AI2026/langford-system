// Setup Dr. Ahmed with known password
// Run with: npx tsx scripts/setup-dr-ahmed-with-password.ts

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

const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const DR_AHMED_PASSWORD = "Langford2026";

async function setupDrAhmed() {
  console.log("🚀 Setting up Dr. Ahmed as Admin...\n");

  try {
    // Sign in as Dr. Ahmed to get UID and token
    console.log("🔐 Signing in as Dr. Ahmed...");
    const userCred = await signInWithEmailAndPassword(auth, DR_AHMED_EMAIL, DR_AHMED_PASSWORD);
    const uid = userCred.user.uid;
    const token = await userCred.user.getIdToken();
    
    console.log("✅ Signed in successfully");
    console.log(`   UID: ${uid}\n`);

    // Create/Update Firestore user document with admin role
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
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDoc),
    });

    if (!firestoreRes.ok) {
      const err = await firestoreRes.json();
      throw new Error(`Firestore write failed: ${JSON.stringify(err)}`);
    }

    console.log("✅ Admin user document created successfully!\n");

    // Success message
    console.log("=".repeat(60));
    console.log("🎉 DR. AHMED ADMIN ACCOUNT READY!");
    console.log("=".repeat(60));
    console.log("\n📋 Account Details:");
    console.log(`   Email:    ${DR_AHMED_EMAIL}`);
    console.log(`   Password: ${DR_AHMED_PASSWORD} (يمكن تغييره من Profile)`);
    console.log(`   Name:     Dr. Ahmed`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
    console.log("\n🌐 Login at:");
    console.log("   https://langford-system.vercel.app/login");
    console.log("\n✅ Can now login and access all admin features!");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      console.error("\n⚠️  The password 'Langford2026' is incorrect.");
      console.error("   Please check the password and try again.");
    } else if (error.code === "auth/user-not-found") {
      console.error("\n⚠️  User not found. The account may not exist yet.");
    }
    
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

setupDrAhmed();
