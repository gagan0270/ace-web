const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function nukeAllStudents() {
  console.log("=== FORCE DELETING ALL STUDENTS FROM FIRESTORE ===");

  let totalDeleted = 0;

  while (true) {
    const snap = await db.collection('students').limit(100).get();
    if (snap.empty) {
      console.log("No more students found.");
      break;
    }

    console.log(`Deleting batch of ${snap.size} students...`);

    for (const docSnap of snap.docs) {
      const satsId = docSnap.id;

      // Delete subcollections
      for (const sub of ['attendance', 'notifications', 'fees', 'marks']) {
        try {
          const subSnap = await db.collection(`students/${satsId}/${sub}`).get();
          const b = db.batch();
          subSnap.forEach(d => b.delete(d.ref));
          if (!subSnap.empty) await b.commit();
        } catch(e) {}
      }

      // Delete the student document itself
      await db.collection('students').doc(satsId).delete();
      totalDeleted++;
      console.log(`  Deleted: ${satsId}`);
    }
  }

  // Verify
  const verify = await db.collection('students').get();
  console.log(`\n=== DONE. Total deleted: ${totalDeleted} ===`);
  console.log(`Remaining students in Firestore: ${verify.size}`);
  process.exit(0);
}

nukeAllStudents().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
