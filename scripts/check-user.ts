// Check if a user exists and their role
// Run with: npx tsx scripts/check-user.ts

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

async function checkUsers() {
  console.log("🔍 Checking all users...\n");

  try {
    // Sign in as admin to get token
    console.log("🔐 Signing in as admin...");
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const token = await userCredential.user.getIdToken();
    console.log("✅ Signed in successfully\n");

    // Fetch all users
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
        isActive: r.document.fields?.isActive?.booleanValue ?? true,
      }));

    console.log(`📊 Total users found: ${users.length}\n`);
    console.log("=" .repeat(80));

    // Show all users
    users.forEach((user: any) => {
      console.log(`👤 ${user.displayName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   UID: ${user.id}`);
      console.log("-".repeat(80));
    });

    // Check for Fatma/فاطمة specifically
    console.log("\n🔍 Looking for user 'Fatma' or 'فاطمة'...\n");
    const fatma = users.find((u: any) => 
      u.displayName.toLowerCase().includes("fatma") || 
      u.displayName.toLowerCase().includes("فاطمة") ||
      u.email.toLowerCase().includes("fatma")
    );

    if (fatma) {
      console.log("✅ Found Fatma!");
      console.log(`   Name: ${fatma.displayName}`);
      console.log(`   Email: ${fatma.email}`);
      console.log(`   Role: ${fatma.role}`);
      console.log(`   Active: ${fatma.isActive}`);
      console.log(`   UID: ${fatma.id}`);

      if (fatma.role !== "sales") {
        console.log("\n⚠️  WARNING: Fatma's role is NOT 'sales'!");
        console.log(`   Current role: ${fatma.role}`);
        console.log("   This might be the problem.");
      } else {
        console.log("\n✅ Fatma has the correct 'sales' role.");
      }

      if (!fatma.isActive) {
        console.log("\n⚠️  WARNING: Fatma's account is INACTIVE!");
      }
    } else {
      console.log("❌ User 'Fatma' not found in the database.");
      console.log("   Please check the exact name or email.");
    }

    // Show all sales users
    console.log("\n\n📋 All Sales Users:");
    console.log("=" .repeat(80));
    const salesUsers = users.filter((u: any) => u.role === "sales" && u.isActive);
    
    if (salesUsers.length === 0) {
      console.log("❌ No active sales users found!");
    } else {
      salesUsers.forEach((user: any) => {
        console.log(`👤 ${user.displayName} (${user.email})`);
      });
    }

    console.log("\n");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  }
}

checkUsers();
