// seedStudents.cjs
// This script purges existing student data and seeds mock data into Firestore using nested sub-collections.
// Path: src/admin/seedStudents.cjs

const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const path = require('path');

// Load service account key (ensure the file exists at project root)
const serviceAccountPath = path.resolve(__dirname, '../../firebase-admin-key.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/** Helper to delete all documents in a collection (non‑recursive) */
async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  console.log('🏁 Starting Firestore seeding...');

  // 1️⃣ Purge old student data (root collection "students" if it exists)
  const oldStudentsCol = db.collection('students');
  try {
    await deleteCollection(oldStudentsCol);
    console.log('🧹 Deleted old root "students" collection');
  } catch (e) {
    console.warn('⚠️ Could not delete root "students" collection (might not exist):', e.message);
  }

  const classCount = 10; // Classes 1‑10
  const sections = ['A', 'B', 'C', 'D']; // Default sections per class
  const studentsPerSection = 20; // 20 mock students per section

  for (let c = 1; c <= classCount; c++) {
    const classId = `class${c}`;
    const classRef = db.collection('classes').doc(classId);
    await classRef.set({
      name: `Class ${c}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Created class ${classId}`);

    for (const sec of sections) {
      const sectionId = `section${sec}`;
      const sectionRef = classRef.collection('sections').doc(sectionId);
      await sectionRef.set({
        name: `Section ${sec}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`   ➡️ Created ${classId}/${sectionId}`);

      const batch = db.batch();
      for (let s = 1; s <= studentsPerSection; s++) {
        const studentId = `student_${c}_${sec}_${s}`;
        const studentRef = sectionRef.collection('students').doc(studentId);
        batch.set(studentRef, {
          firstName: `First${s}`,
          lastName: `Last${s}`,
          email: `student${c}${sec}${s}@example.com`,
          classId: classRef.id,
          sectionId: sectionRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      console.log(`      🎓 Seeded ${studentsPerSection} students for ${classId}/${sectionId}`);
    }
  }

  console.log('🏆 Seeding completed successfully!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
