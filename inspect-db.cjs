const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function inspectAttendance() {
  console.log("Searching for live attendance records...");
  const studentsSnapshot = await db.collection('students').limit(10).get();
  
  for (const doc of studentsSnapshot.docs) {
    const studentId = doc.id;
    const attendanceSnapshot = await db.collection(`students/${studentId}/attendance`).limit(5).get();
    
    if (!attendanceSnapshot.empty) {
      console.log(`\nFound attendance for student: ${studentId}`);
      attendanceSnapshot.forEach(attDoc => {
        console.log(`  Document ID (Date Key): ${attDoc.id}`);
        console.log(`  Data:`, attDoc.data());
      });
    }
  }
  console.log("\nInspection complete.");
}

inspectAttendance().catch(console.error);
