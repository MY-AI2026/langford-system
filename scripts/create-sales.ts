// Run with: npx tsx scripts/create-sales.ts
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
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

async function createSalesUser() {
  const email = "sales@langford.edu.kw";
  const password = "Sales@2025";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      email,
      displayName: "Ahmad Sales",
      role: "sales",
      phone: "99887766",
      monthlyTarget: 5000,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("✅ Sales user created successfully!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("🆔 UID:", uid);
    process.exit(0);
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

createSalesUser();
