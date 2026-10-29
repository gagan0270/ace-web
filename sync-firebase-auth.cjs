const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function syncAuthUsers() {
  console.log("=== SYNCING ALL 100 STUDENTS TO FIREBASE AUTHENTICATION ===");
  console.log("Setting email: satsid@ace.school | password: student123\n");

  const snap = await db.collection('students').get();
  console.log(`Found ${snap.size} students in Firestore.`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const docSnap of snap.docs) {
    const satsId = docSnap.id;
    const email = `${satsId.toLowerCase()}@ace.school`;
    const password = "student123";

    try {
      // Check if Firebase Auth user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          userRecord = null;
        } else {
          throw err;
        }
      }

      if (userRecord) {
        // Update password
        await auth.updateUser(userRecord.uid, {
          password: password,
          disabled: false
        });
        updated++;
        console.log(`  ✅ Updated Auth for ${satsId} (${email})`);
      } else {
        // Create user
        await auth.createUser({
          email: email,
          password: password,
          displayName: docSnap.data().name || satsId,
          disabled: false
        });
        created++;
        console.log(`  ✨ Created Auth for ${satsId} (${email})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ Failed for ${satsId} (${email}):`, err.message);
    }
  }

  console.log(`\n=== FIREBASE AUTH SYNC COMPLETE ===`);
  console.log(`Created: ${created} | Updated: ${updated} | Failed: ${failed}`);
  process.exit(0);
}

syncAuthUsers().catch(err => {
  console.error("Auth sync error:", err);
  process.exit(1);
});
