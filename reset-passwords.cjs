const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function resetAllPasswords() {
  console.log("=== RESETTING ALL STUDENT PASSWORDS TO student123 ===\n");

  const snap = await db.collection('students').get();
  console.log(`Found ${snap.size} students. Updating...`);

  const batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      password: "student123",
      parentPassword: "student123",
      studentPassword: "student123",
      mustChangePassword: true,
      forcePasswordReset: true,
      firstLogin: true,
      lastUpdatedTimestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    count++;
    console.log(`  ✅ ${doc.id}`);
  }

  await batch.commit();

  console.log(`\n=== DONE. Updated ${count} students to password: student123 ===`);
  process.exit(0);
}

resetAllPasswords().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
