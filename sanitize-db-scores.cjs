const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function sanitizeDatabaseScores() {
  console.log("=== SANITIZING ALL STUDENT ACADEMIC MARKS IN FIRESTORE ===");

  const snap = await db.collection('students').get();
  console.log(`Fetched ${snap.size} students to inspect...`);

  let count = 0;
  const batch = db.batch();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const marks = data.marks || {};
    let modified = false;

    const sanitizedMarks = {};

    Object.entries(marks).forEach(([catKey, catData]) => {
      sanitizedMarks[catKey] = { ...(catData || {}) };
      const rawScores = catData?.scores || {};
      const sanitizedScores = {};

      Object.entries(rawScores).forEach(([subKey, val]) => {
        const cleanedStr = String(val ?? 0).replace(/^0+(?=\d)/, "");
        const numVal = parseInt(cleanedStr, 10);
        const finalNum = isNaN(numVal) ? 0 : Math.min(100, Math.max(0, numVal));

        if (val !== finalNum) {
          modified = true;
        }
        sanitizedScores[subKey] = finalNum;
      });

      sanitizedMarks[catKey].scores = sanitizedScores;
    });

    if (modified) {
      batch.update(docSnap.ref, { marks: sanitizedMarks });
      count++;
      console.log(`  Cleaned scores for student: ${docSnap.id}`);
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`\n✅ Sanitized and saved marks for ${count} students in Firestore.`);
  } else {
    console.log("\n✅ All student scores in Firestore are already sanitized numbers.");
  }

  process.exit(0);
}

sanitizeDatabaseScores().catch(err => {
  console.error("Sanitization error:", err);
  process.exit(1);
});
