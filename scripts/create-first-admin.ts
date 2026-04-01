// Create the first admin user using Identity Toolkit REST API
// Run with: npx tsx scripts/create-first-admin.ts

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps";
const PROJECT_ID = "langford-system";

const ADMIN_EMAIL = "admin@langford.edu.kw";
const ADMIN_PASSWORD = "Admin@2025"; // Try old password first
const ADMIN_NAME = "Admin";

async function createAdmin() {
  console.log("🚀 Creating First Admin User...\n");

  try {
    // Step 1: Create user in Firebase Auth using Identity Toolkit
    console.log("📧 Creating admin user in Firebase Auth...");

    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
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
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
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

    // Step 2: Create user document in Firestore using REST API
    console.log("\n📝 Creating admin user document in Firestore...");

    const now = new Date().toISOString();
    const userDoc = {
      fields: {
        email: { stringValue: ADMIN_EMAIL },
        displayName: { stringValue: ADMIN_NAME },
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

    // Step 3: Create default settings
    console.log("\n⚙️  Creating default system settings...");

    const settingsDoc = {
      fields: {
        leadSources: {
          arrayValue: {
            values: [
              { stringValue: "Walk-in" },
              { stringValue: "Phone Inquiry" },
              { stringValue: "Social Media" },
              { stringValue: "Website" },
              { stringValue: "Referral" },
              { stringValue: "Sponsor" },
              { stringValue: "Exhibition" },
              { stringValue: "Other" },
            ],
          },
        },
        levels: {
          arrayValue: {
            values: [
              { stringValue: "A1" },
              { stringValue: "A2" },
              { stringValue: "B1" },
              { stringValue: "B2" },
              { stringValue: "C1" },
              { stringValue: "C2" },
            ],
          },
        },
        paymentMethods: {
          arrayValue: {
            values: [
              { stringValue: "cash" },
              { stringValue: "card" },
              { stringValue: "bank_transfer" },
              { stringValue: "online" },
            ],
          },
        },
        defaultCurrency: { stringValue: "KWD" },
        instituteName: { stringValue: "Langford International Institute" },
        institutePhone: { stringValue: "+965 XXXX XXXX" },
        instituteAddress: { stringValue: "Kuwait City, Kuwait" },
      },
    };

    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/general`;
    const settingsResponse = await fetch(settingsUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsDoc),
    });

    if (!settingsResponse.ok) {
      const settingsError = await settingsResponse.json();
      console.warn(
        `⚠️  Settings creation failed: ${settingsError.error?.message || "Unknown error"}`
      );
    } else {
      console.log("✅ Default settings created");
    }

    // Success
    console.log("\n" + "=".repeat(60));
    console.log("🎉 ADMIN USER CREATED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   UID:      ${uid}`);
    console.log("\n🌐 Login at:");
    console.log("   https://langford-system.vercel.app/login");
    console.log("\n📚 Next Step:");
    console.log("   Run: npx tsx scripts/seed-courses-rest.ts");
    console.log("   This will add all 24 courses to your system.");
    console.log("\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

createAdmin();
