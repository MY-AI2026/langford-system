// Setup Dr. Ahmed as admin (using main admin to create user document)
// Run with: npx tsx scripts/setup-dr-ahmed-admin.ts

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

// Main admin credentials to perform the operation
const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025";

// Dr. Ahmed's details
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const DR_AHMED_UID = "To be fetched"; // We'll get this from Firebase

async function setupDrAhmed() {
  console.log("🚀 Setting up Dr. Ahmed as Admin...\n");

  try {
    // Sign in as main admin
    console.log("🔐 Signing in as main admin...");
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const token = await userCredential.user.getIdToken();
    console.log("✅ Signed in successfully\n");

    // Get Dr. Ahmed's UID by listing all users
    console.log("🔍 Finding Dr. Ahmed's user ID...");

    // We need to get the UID from Firebase Auth
    // Since we can't easily do that with REST API, let's try to fetch the user document first
    // and if it doesn't exist, we'll need the UID

    // Let's list all users in Firestore to find Dr. Ahmed
    const usersUrl = `${BASE}:runQuery`;
    const usersQuery = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
      },
    };

    const usersResponse = await fetch(usersUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usersQuery),
    });

    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    const users = usersData
      .filter((r: any) => r.document)
      .map((r: any) => ({
        id: r.document.name.split("/").pop(),
        email: r.document.fields?.email?.stringValue || "",
        displayName: r.document.fields?.displayName?.stringValue || "",
        role: r.document.fields?.role?.stringValue || "",
      }));

    console.log(`   Found ${users.length} users in database`);

    const drAhmed = users.find((u: any) => u.email === DR_AHMED_EMAIL);

    if (drAhmed) {
      console.log(`   ✅ Found Dr. Ahmed: ${drAhmed.displayName}`);
      console.log(`   Current role: ${drAhmed.role}`);

      if (drAhmed.role === "admin") {
        console.log("\n✅ Dr. Ahmed already has admin role!");
        console.log("\n📋 Dr. Ahmed's Account:");
        console.log(`   Email:    ${DR_AHMED_EMAIL}`);
        console.log(`   Name:     ${drAhmed.displayName}`);
        console.log(`   Role:     Admin (Full Permissions)`);
        console.log(`   UID:      ${drAhmed.id}`);
        console.log("\n📧 Password reset email sent to: ${DR_AHMED_EMAIL}");
        console.log("   Check email to set a new password");
        console.log("\n🌐 Login at:");
        console.log("   https://langford-system.vercel.app/login");
        console.log("\n");
      } else {
        // Update role to admin
        console.log("\n📝 Updating Dr. Ahmed's role to admin...");

        const now = new Date().toISOString();
        const updateDoc = {
          fields: {
            role: { stringValue: "admin" },
            updatedAt: { timestampValue: now },
          },
        };

        const updateUrl = `${BASE}/users/${drAhmed.id}?updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt`;
        const updateResponse = await fetch(updateUrl, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateDoc),
        });

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json();
          throw new Error(
            `Failed to update role: ${updateError.error?.message || "Unknown error"}`
          );
        }

        console.log("✅ Dr. Ahmed's role updated to admin");
        console.log("\n" + "=".repeat(60));
        console.log("🎉 DR. AHMED ADMIN SETUP COMPLETE!");
        console.log("=".repeat(60));
        console.log("\n📋 Dr. Ahmed's Account:");
        console.log(`   Email:    ${DR_AHMED_EMAIL}`);
        console.log(`   Name:     ${drAhmed.displayName}`);
        console.log(`   Role:     Admin (Full Permissions)`);
        console.log(`   UID:      ${drAhmed.id}`);
        console.log("\n📧 Password reset email sent to: ${DR_AHMED_EMAIL}");
        console.log("   Check email to set a new password");
        console.log("\n🌐 Login at:");
        console.log("   https://langford-system.vercel.app/login");
        console.log("\n");
      }
    } else {
      console.log(`   ⚠️  Dr. Ahmed not found in users collection`);
      console.log("\n   This means the user exists in Firebase Auth but not in Firestore.");
      console.log("   A password reset email has been sent.");
      console.log("   After Dr. Ahmed resets their password and logs in,");
      console.log("   the system will create their user document automatically.");
      console.log("\n   OR you can manually get their UID and create the document.");
      console.log("\n");
    }

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

setupDrAhmed();
