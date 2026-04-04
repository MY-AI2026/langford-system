// Fix all students paymentSummary by recalculating from actual payments
// Run with: npx tsx scripts/fix-payment-summaries.ts

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBAehQqpcj1jkb3nlN-ux5evFUcP6Qn2Ps",
  authDomain: "langford-system.firebaseapp.com",
  projectId: "langford-system",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const PROJECT_ID = "langford-system";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fixPaymentSummaries() {
  console.log("🔧 Fixing payment summaries for all students...\n");

  // Sign in as admin
  const cred = await signInWithEmailAndPassword(auth, "admin@langford.edu.kw", "Admin@2025");
  const token = await cred.user.getIdToken();
  console.log("✅ Signed in as admin\n");

  // Get all students
  const studentsRes = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "students" }] } }),
  });

  const studentsData = await studentsRes.json();
  const students = studentsData
    .filter((r: any) => r.document)
    .map((r: any) => ({
      id: r.document.name.split("/").pop(),
      name: r.document.fields?.fullName?.stringValue || "Unknown",
      fields: r.document.fields || {},
    }));

  console.log(`📊 Found ${students.length} students\n`);

  let fixed = 0;

  for (const student of students) {
    // Get all payments for this student
    const paymentsRes = await fetch(`${BASE}/students/${student.id}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "payments" }] } }),
    });

    const paymentsData = await paymentsRes.json();
    const payments = paymentsData
      .filter((r: any) => r.document)
      .map((r: any) => {
        const fields = r.document.fields || {};
        return {
          amount: Number(fields.amount?.doubleValue ?? fields.amount?.integerValue ?? 0),
        };
      });

    // Calculate totals from actual payments
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Get current totalFees from paymentSummary
    const currentSummary = student.fields.paymentSummary?.mapValue?.fields || {};
    const totalFees = Number(
      currentSummary.totalFees?.doubleValue ??
      currentSummary.totalFees?.integerValue ?? 0
    );

    const remaining = Math.max(0, totalFees - totalPaid);
    let status = "pending";
    if (remaining <= 0 && totalPaid > 0) status = "paid";
    else if (totalPaid > 0) status = "partial";

    // Update student document
    const updateUrl = `${BASE}/students/${student.id}?updateMask.fieldPaths=paymentSummary`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          paymentSummary: {
            mapValue: {
              fields: {
                totalFees: { doubleValue: totalFees },
                amountPaid: { doubleValue: totalPaid },
                remainingBalance: { doubleValue: remaining },
                paymentStatus: { stringValue: status },
                hasOverdue: { booleanValue: false },
              },
            },
          },
        },
      }),
    });

    if (updateRes.ok) {
      if (payments.length > 0 || totalFees > 0) {
        console.log(`✅ ${student.name}`);
        console.log(`   💰 Fees: ${totalFees} | Paid: ${totalPaid} | Remaining: ${remaining} | Status: ${status}`);
        console.log(`   📝 ${payments.length} payment(s) found`);
        fixed++;
      }
    } else {
      console.log(`❌ Failed to update ${student.name}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎉 Done! Fixed ${fixed} student(s) with payment data`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(0);
}

fixPaymentSummaries().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
