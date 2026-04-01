// Create Dr. Ahmed account with new password
// Run with: npx tsx scripts/create-dr-ahmed-new.ts

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const PROJECT_ID = "langford-system";

const DR_AHMED_EMAIL = "ahmedelnahrawy@langfordkw.com";
const DR_AHMED_PASSWORD = "Langford2026";

async function createDrAhmed() {
  console.log("🚀 Creating Dr. Ahmed Admin Account...\n");

  try {
    let uid: string;
    let idToken: string;

    // Try to create new user
    console.log("📧 Creating user in Firebase Auth...");
    
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: DR_AHMED_EMAIL,
          password: DR_AHMED_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );

    if (!signUpRes.ok) {
      const err = await signUpRes.json();
      
      if (err.error?.message === "EMAIL_EXISTS") {
        // User exists, try to sign in
        console.log("ℹ️  User already exists, trying to sign in...");
        
        const signInRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: DR_AHMED_EMAIL,
              password: DR_AHMED_PASSWORD,
              returnSecureToken: true,
            }),
          }
        );

        if (!signInRes.ok) {
          const signInErr = await signInRes.json();
          throw new Error(
            `Cannot sign in: ${signInErr.error?.message || "Wrong password"}.\n` +
            `   The account exists but password is different.\n` +
            `   Use Firebase Console to reset password or delete and recreate the account.`
          );
        }

        const signInData = await signInRes.json();
        uid = signInData.localId;
        idToken = signInData.idToken;
        console.log("✅ Signed in successfully");
      } else {
        throw new Error(`Failed to create user: ${err.error?.message}`);
      }
    } else {
      const signUpData = await signUpRes.json();
      uid = signUpData.localId;
      idToken = signUpData.idToken;
      console.log("✅ User created in Firebase Auth");
    }

    console.log(`   UID: ${uid}\n`);

    // Create Firestore document
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

    // Success
    console.log("=".repeat(60));
    console.log("🎉 DR. AHMED ADMIN ACCOUNT READY!");
    console.log("=".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log(`   Email:    ${DR_AHMED_EMAIL}`);
    console.log(`   Password: ${DR_AHMED_PASSWORD}`);
    console.log(`   Name:     Dr. Ahmed`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
    console.log("\n🌐 Login at:");
    console.log("   https://langford-system.vercel.app/login");
    console.log("\n💡 يمكن تغيير كلمة السر من Profile بعد تسجيل الدخول");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

createDrAhmed();
