// Send password reset email to Dr. Ahmed
// Run with: npx tsx scripts/reset-dr-ahmed-password.ts

import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

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

const EMAIL = "ahmedelnahrawy@langfordkw.com";

async function resetPassword() {
  console.log("📧 Sending password reset email to Dr. Ahmed...\n");

  try {
    await sendPasswordResetEmail(auth, EMAIL);

    console.log("✅ Password reset email sent successfully!");
    console.log("\n📋 Next Steps:");
    console.log(`   1. Check email: ${EMAIL}`);
    console.log("   2. Click the reset link in the email");
    console.log("   3. Set a new password");
    console.log("   4. Login at: https://langford-system.vercel.app/login");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  }
}

resetPassword();
