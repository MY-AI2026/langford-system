// Run with: npx tsx scripts/create-admin.ts
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps",
  authDomain: "langford-system.firebaseapp.com",
  projectId: "langford-system",
  storageBucket: "langford-system.firebasestorage.app",
  messagingSenderId: "799147080189",
  appId: "1:799147080189:web:7542ae4cd634fb1a170194",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  const email = "admin@langford.edu.kw";
  const password = "Admin@2025";

  try {
    // Sign in with the existing user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Write user document to Firestore
    await setDoc(doc(db, "users", uid), {
      email,
      displayName: "Admin",
      role: "admin",
      phone: "",
      monthlyTarget: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Write default settings
    await setDoc(doc(db, "settings", "general"), {
      leadSources: ["Walk-in", "Phone Inquiry", "Social Media", "Website", "Referral", "Sponsor", "Exhibition", "Other"],
      levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
      paymentMethods: ["cash", "card", "bank_transfer", "online"],
      defaultCurrency: "KWD",
      instituteName: "Langford International Institute",
      institutePhone: "",
      instituteAddress: "Kuwait",
    });

    console.log("✅ Admin user setup complete!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("🆔 UID:", uid);
    process.exit(0);
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

setupAdmin();
