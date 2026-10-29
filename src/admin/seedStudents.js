// seedStudents.js
// Standardized Firestore seeding script to populate classes, sections, and 20 students per section.

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account key
const serviceAccountPath = path.resolve(__dirname, '../../firebase-admin-key.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  console.log('🏁 Starting Firestore database seeding...');

  const classes = [
    { name: "1st Class", order: 1 },
    { name: "2nd Class", order: 2 },
    { name: "3rd Class", order: 3 },
    { name: "4th Class", order: 4 },
    { name: "5th Class", order: 5 },
    { name: "6th Class", order: 6 },
    { name: "7th Class", order: 7 },
    { name: "8th Class", order: 8 },
    { name: "9th Class", order: 9 },
    { name: "10th Class", order: 10 }
  ];
  const sections = ["Section A", "Section B", "Section C", "Section D"];
  const studentsPerSection = 20;

  // 1. Purge root collections
  console.log('🧹 Purging old students collection...');
  await deleteCollection(db.collection('students'));
  console.log('🧹 Purging old classes collection...');
  // Delete sub-collections first then parent docs
  const classSnap = await db.collection('classes').get();
  for (const doc of classSnap.docs) {
    await deleteCollection(doc.ref.collection('sections'));
    await doc.ref.delete();
  }

  // 2. Seed Class & Section Configuration
  console.log('🌱 Seeding class & section configurations...');
  for (const cls of classes) {
    const classRef = db.collection('classes').doc(cls.name);
    await classRef.set({
      name: cls.name,
      order: cls.order,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    for (const sec of sections) {
      const secRef = classRef.collection('sections').doc(sec);
      await secRef.set({
        name: sec,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    console.log(`✅ Configured ${cls.name} with sections.`);
  }

  // 3. Seed Students (Root collection "students")
  console.log('🎓 Seeding active students in root students collection...');
  let totalSeeded = 0;

  for (const cls of classes) {
    for (const sec of sections) {
      const batch = db.batch();
      for (let s = 1; s <= studentsPerSection; s++) {
        // Generate systematic SATS key
        const classNum = cls.order;
        const secLetter = sec.replace("Section ", "");
        const satsId = `SATS${String(classNum).padStart(2, '0')}${secLetter}${String(s).padStart(3, '0')}`;
        
        const studentRef = db.collection('students').doc(satsId);
        batch.set(studentRef, {
          satsId: satsId,
          name: `STUDENT ${cls.order} ${secLetter} ${s}`,
          gender: s % 2 === 0 ? "Female" : "Male",
          class: cls.name,
          section: sec,
          assignedBusNumber: `Bus-${100 + (s % 3 + 1)}`,
          parentUid: `Parent-${satsId}`,
          parentEmail: `${satsId.toLowerCase()}@ace-parents.com`,
          status: "active",
          fees: {
            totalAllocated: 1500,
            totalPaid: s % 5 === 0 ? 1500 : (s % 3 === 0 ? 500 : 0)
          },
          marks: {
            midterm: {
              max_marks: 100,
              scores: { math: 75 + (s % 25), science: 70 + (s % 30), english: 80 + (s % 20) }
            },
            final: {
              max_marks: 100,
              scores: { math: 80 + (s % 20), science: 75 + (s % 25), english: 85 + (s % 15) }
            }
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        totalSeeded++;
      }
      await batch.commit();
      console.log(`   ➡️ Seeded 20 students for ${cls.name} / ${sec}`);
    }
  }

  console.log(`🏆 Database Seeding Completed successfully! Total Students Seeded: ${totalSeeded}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
