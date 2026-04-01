// Final setup for Dr. Ahmed - creates user and sends password reset
// Run with: npx tsx scripts/setup-dr-ahmed-final.ts

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const PROJECT_ID = "langford-system";

const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const TEMP_PASSWORD = "TempDrAhmed@2025"; // Temporary password

async function setupDrAhmed() {
  console.log("🚀 Setting up Dr. Ahmed as Admin...\n");

  try {
    let uid: string;
    let idToken: string;

    // Step 1: Try to create user in Firebase Auth
    console.log("📧 Creating user account...");
    
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DR_AHMED_EMAIL,
          password: TEMP_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );

    if (!signUpRes.ok) {
      const err = await signUpRes.json();
      
      // If user already exists, sign in instead
      if (err.error?.message === "EMAIL_EXISTS") {
        console.log("ℹ️  User already exists, attempting to use existing account...");
        
        // We can't sign in without password, so we'll just send password reset
        console.log("📧 Sending password reset email...");
        
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
          throw new Error("Failed to send password reset");
        }

        console.log("✅ Password reset email sent!\n");
        console.log("⚠️  IMPORTANT: Cannot create Firestore document without UID.");
        console.log("   Please ask Dr. Ahmed to:");
        console.log("   1. Check email and reset password");
        console.log("   2. Login at: https://langford-system.vercel.app/login");
        console.log("   3. After first login, contact you to set admin role\n");
        process.exit(0);
      }
      
      throw new Error(`Failed to create user: ${err.error?.message}`);
    }

    const signUpData = await signUpRes.json();
    uid = signUpData.localId;
    idToken = signUpData.idToken;

    console.log("✅ User created in Firebase Auth");
    console.log(`   UID: ${uid}\n`);

    // Step 2: Create Firestore document
    console.log("📝 Creating admin user document...");

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

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const firestoreRes = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDoc),
    });

    if (!firestoreRes.ok) {
      const err = await firestoreRes.json();
      throw new Error(`Firestore write failed: ${JSON.stringify(err)}`);
    }

    console.log("✅ Admin user document created\n");

    // Step 3: Send password reset email
    console.log("📧 Sending password reset email...");
    
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
      console.log("⚠️  Warning: Failed to send password reset email");
      console.log(`   But account was created with password: ${TEMP_PASSWORD}`);
    } else {
      console.log("✅ Password reset email sent!\n");
    }

    // Success
    console.log("=".repeat(60));
    console.log("🎉 DR. AHMED ADMIN ACCOUNT READY!");
    console.log("=".repeat(60));
    console.log("\n📋 Account Details:");
    console.log(`   Email:    ${DR_AHMED_EMAIL}`);
    console.log(`   Name:     Dr. Ahmed`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
    console.log("\n📧 Next Steps:");
    console.log("   1. Check email: ahmedelnahrawy@langfordkw.com");
    console.log("   2. Click the password reset link");
    console.log("   3. Set a secure password");
    console.log("\n🌐 Login at:");
    console.log("   https://langford-system.vercel.app/login");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

setupDrAhmed();
