// Create Dr. Ahmed admin user
// Run with: npx tsx scripts/create-dr-ahmed-admin.ts

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const PROJECT_ID = "langford-system";

const EMAIL = "ahmedelnahrawy@langfordkw.com";
const PASSWORD = "DrAhmed@2025"; // Password for Dr. Ahmed
const NAME = "Dr. Ahmed";

async function createDrAhmed() {
  console.log("🚀 Creating Dr. Ahmed Admin User...\n");

  try {
    // Step 1: Create user in Firebase Auth
    console.log("📧 Creating admin user in Firebase Auth...");

    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: EMAIL,
          password: PASSWORD,
          returnSecureToken: true,
        }),
      }
    );

    let idToken: string;
    let uid: string;

    if (!signUpResponse.ok) {
      const error = await signUpResponse.json();

      if (error.error?.message === "EMAIL_EXISTS") {
        console.log("ℹ️  User already exists, signing in...");

        // Sign in to get token
        const signInResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: EMAIL,
              password: PASSWORD,
              returnSecureToken: true,
            }),
          }
        );

        if (!signInResponse.ok) {
          const signInError = await signInResponse.json();
          throw new Error(
            `Sign in failed: ${signInError.error?.message || "Unknown error"}`
          );
        }

        const signInData = await signInResponse.json();
        idToken = signInData.idToken;
        uid = signInData.localId;
        console.log("✅ Signed in successfully");
      } else {
        throw new Error(
          `Failed to create user: ${error.error?.message || "Unknown error"}`
        );
      }
    } else {
      const signUpData = await signUpResponse.json();
      idToken = signUpData.idToken;
      uid = signUpData.localId;
      console.log("✅ Admin user created in Firebase Auth");
    }

    console.log(`   UID: ${uid}`);

    // Step 2: Create user document in Firestore
    console.log("\n📝 Creating admin user document in Firestore...");

    const now = new Date().toISOString();
    const userDoc = {
      fields: {
        email: { stringValue: EMAIL },
        displayName: { stringValue: NAME },
        role: { stringValue: "admin" },
        phone: { stringValue: "" },
        monthlyTarget: { integerValue: "0" },
        isActive: { booleanValue: true },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const firestoreResponse = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
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

    console.log("✅ Admin user document created");

    // Success
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DR. AHMED ADMIN CREATED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log(`   Name:     ${NAME}`);
    console.log(`   Role:     Admin (Full Permissions)`);
    console.log(`   UID:      ${uid}`);
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

createDrAhmed();
