const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const KEEP = ["1st Class", "2nd Class", "3rd Class"];

async function deletePathRecursively(docRef) {
  const collections = await docRef.listCollections();
  for (const col of collections) {
    const snap = await col.get();
    for (const d of snap.docs) {
      await deletePathRecursively(d.ref);
    }
  }
  await docRef.delete();
}

async function main() {
  console.log("=== DEEP PURGING PHANTOM DOCUMENT PATHS IN /classes ===");

  const classesRef = db.collection('classes');
  const snap = await classesRef.get();

  for (const docSnap of snap.docs) {
    if (!KEEP.includes(docSnap.id)) {
      console.log(`Deep deleting document: /classes/${docSnap.id}`);
      await deletePathRecursively(docSnap.ref);
    }
  }

  // Explicit list of known phantom IDs visible in user's screenshot
  const phantoms = [
    "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class",
    "class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9", "class10"
  ];

  for (const pid of phantoms) {
    const ref = classesRef.doc(pid);
    await deletePathRecursively(ref);
    console.log(`Deep purged phantom path: /classes/${pid}`);
  }

  const finalSnap = await classesRef.get();
  console.log("\n=== FINISHED PURGE ===");
  console.log("Active classes remaining:", finalSnap.docs.map(d => d.id).join(", "));
  process.exit(0);
}

main().catch(err => {
  console.error("Purge error:", err);
  process.exit(1);
});
