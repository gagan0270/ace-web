const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function cleanPasswords() {
  console.log("=== CLEANING: keeping only 'password' field, removing parentPassword & studentPassword ===\n");

  const snap = await db.collection('students').get();
  console.log(`Found ${snap.size} students. Cleaning up...`);

  const batch = db.batch();

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      password: "student123",
      parentPassword: FieldValue.delete(),   // remove this field
      studentPassword: FieldValue.delete(),  // remove this field
      mustChangePassword: true,
      lastUpdatedTimestamp: FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Cleaned: ${doc.id}`);
  }

  await batch.commit();

  console.log(`\n=== DONE. ${snap.size} students now have only 'password' field = "student123" ===`);
  process.exit(0);
}

cleanPasswords().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
