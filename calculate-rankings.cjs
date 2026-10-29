const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

function calculateStudentTotalScore(marks) {
  let totalScore = 0;
  let totalMax = 0;
  let count = 0;

  if (!marks) return { totalScore: 0, totalMax: 0, percentage: 0 };

  Object.entries(marks).forEach(([catKey, catData]) => {
    const scores = catData?.scores || {};
    const maxPerSub = Number(catData?.max_marks || 100);

    Object.entries(scores).forEach(([subKey, val]) => {
      const numVal = Number(val || 0);
      totalScore += numVal;
      totalMax += maxPerSub;
      count++;
    });
  });

  const percentage = totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0;
  return { totalScore, totalMax, percentage, count };
}

async function computeAndPublishRankings() {
  console.log("=============================================================");
  console.log("  ACE SCHOOL — RANKING ENGINE & /rankings COLLECTION SEED");
  console.log("=============================================================\n");

  const studentsSnap = await db.collection('students').get();
  console.log(`Fetched ${studentsSnap.size} students from Firestore.`);

  if (studentsSnap.empty) {
    console.log("No students found.");
    process.exit(0);
  }

  // 1. Group students by Class and by Section
  const allStudents = [];
  const byClass = {};
  const byClassAndSection = {};

  studentsSnap.forEach((doc) => {
    const d = doc.data();
    const satsId = d.satsId || doc.id;
    const name = d.name || "Unnamed Student";
    const className = d.class || "1st Class";
    const sectionName = d.section || "Section A";
    const marks = d.marks || {};

    const { totalScore, totalMax, percentage, count } = calculateStudentTotalScore(marks);

    const sObj = {
      satsId,
      name,
      class: className,
      section: sectionName,
      totalScore,
      totalMax,
      percentage,
      count,
      ref: doc.ref
    };

    allStudents.push(sObj);

    if (!byClass[className]) byClass[className] = [];
    byClass[className].push(sObj);

    const secKey = `${className}_${sectionName}`;
    if (!byClassAndSection[secKey]) byClassAndSection[secKey] = [];
    byClassAndSection[secKey].push(sObj);
  });

  // 2. Sort & assign Class Ranks
  Object.keys(byClass).forEach((cName) => {
    byClass[cName].sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage);
    byClass[cName].forEach((s, idx) => {
      s.classRank = idx + 1;
      s.classTotal = byClass[cName].length;
    });
  });

  // 3. Sort & assign Section Ranks
  Object.keys(byClassAndSection).forEach((secKey) => {
    byClassAndSection[secKey].sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage);
    byClassAndSection[secKey].forEach((s, idx) => {
      s.sectionRank = idx + 1;
      s.sectionTotal = byClassAndSection[secKey].length;
    });
  });

  console.log("Writing calculated ranks to `/rankings` collection & updating `/students`...");

  // 4. Batch write to /rankings collection and update /students docs
  const batches = [];
  let batch = db.batch();
  let count = 0;

  for (const s of allStudents) {
    const rankingDocRef = db.collection('rankings').doc(s.satsId);

    const rankingPayload = {
      satsId: s.satsId,
      studentName: s.name,
      class: s.class,
      section: s.section,
      totalScore: s.totalScore,
      totalMaxMarks: s.totalMax,
      percentage: s.percentage,
      sectionRank: s.sectionRank,
      sectionTotalStudents: s.sectionTotal,
      classRank: s.classRank,
      classTotalStudents: s.classTotal,
      lastUpdated: ts(),
      updatedAt: new Date().toISOString()
    };

    // Save to /rankings/{satsId}
    batch.set(rankingDocRef, rankingPayload, { merge: true });

    // Also sync to /students/{satsId} for direct student doc queries
    batch.set(s.ref, {
      sectionRank: s.sectionRank,
      sectionTotalStudents: s.sectionTotal,
      classRank: s.classRank,
      classTotalStudents: s.classTotal,
      percentage: s.percentage,
      totalScore: s.totalScore,
      lastRankUpdate: ts()
    }, { merge: true });

    count += 2;
    if (count >= 400) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }

  batches.push(batch.commit());
  await Promise.all(batches);

  console.log(`\n=============================================================`);
  console.log(`  ✅ SUCCESS! Published ranks for ${allStudents.length} students`);
  console.log(`  📁 Dedicated Collection Name: 'rankings'`);
  console.log(`  📄 Document Path Example: /rankings/SATS01A01`);
  console.log(`  🏆 Fields: sectionRank, classRank, percentage, totalScore`);
  console.log(`=============================================================`);

  process.exit(0);
}

computeAndPublishRankings().catch(err => {
  console.error("Ranking calculation error:", err);
  process.exit(1);
});
