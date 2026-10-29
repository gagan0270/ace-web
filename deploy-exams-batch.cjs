const admin = require('firebase-admin');

// Initialize administrative SDK
if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const examId = "midterm";
  const targetClass = "10th";
  const targetSections = ["A", "B"];
  const maxMarks = 100;
  const passingMarks = 35;
  const subjects = ["math", "science", "english"];

  console.log(`Querying Firestore students database...`);
  const studentsRef = db.collection('students');
  // Only query active students
  const querySnapshot = await studentsRef.where('status', '==', 'active').get();
  
  if (querySnapshot.empty) {
    console.log("No active students found in Firestore.");
    process.exit(0);
  }

  const batch = db.batch();
  let count = 0;

  const scoresMap = {};
  subjects.forEach(sub => {
    scoresMap[sub] = 80; // default initial score
  });

  const examData = {
    max_marks: maxMarks,
    passing_marks: passingMarks,
    scores: scoresMap
  };

  querySnapshot.forEach(docSnap => {
    const student = docSnap.data();
    if (student.class === targetClass && targetSections.includes(student.section)) {
      console.log(`Scheduling midterm exam for student: ${student.name} (${student.satsId})`);
      const studentDocRef = studentsRef.doc(docSnap.id);
      batch.update(studentDocRef, {
        [`marks.${examId}`]: examData,
        lastUpdatedBy: "system_admin_scheduler",
        lastUpdatedTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;
    }
  });

  if (count > 0) {
    console.log(`Writing updates for ${count} students in an atomic batch...`);
    await batch.commit();
    console.log(`Successfully deployed ${examId} exam schema under marks.${examId} to ${count} students!`);
  } else {
    console.log(`No active students matched target Class "${targetClass}" and Sections ${JSON.stringify(targetSections)}.`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Batch exam scheduling deployment failed:", err);
  process.exit(1);
});
