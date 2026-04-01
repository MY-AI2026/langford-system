// Check Firebase Auth for user
// Run with: npx tsx scripts/check-firebase-auth.ts

const API_KEY = "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";

async function checkAuth() {
  console.log("🔍 Checking Firebase Authentication...\n");

  try {
    // Try to send password reset to see if account exists
    console.log(`📧 Checking if ${DR_AHMED_EMAIL} exists in Firebase Auth...`);
    
    const resetRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: DR_AHMED_EMAIL,
        }),
      }
    );

    if (!resetRes.ok) {
      const err = await resetRes.json();
      if (err.error?.message === "EMAIL_NOT_FOUND") {
        console.log("❌ User does NOT exist in Firebase Auth");
        console.log("\n✅ Good! We can create a new account now.");
        console.log("\n📋 Run this command to create the account:");
        console.log("   npx tsx scripts/create-dr-ahmed-admin.ts");
      } else {
        console.log(`⚠️  Error: ${err.error?.message}`);
      }
    } else {
      console.log("✅ User EXISTS in Firebase Auth");
      console.log("   (Password reset email sent)");
      console.log("\n⚠️  The account exists but we don't know the password.");
      console.log("\n📋 Solutions:");
      console.log("   1. Delete user from Firebase Console:");
      console.log("      https://console.firebase.google.com/project/langford-system/authentication/users");
      console.log("\n   2. Or ask Dr. Ahmed to reset password via email");
    }

    console.log("\n");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  }
}

checkAuth();
