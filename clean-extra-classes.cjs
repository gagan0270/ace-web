const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const VALID_CLASSES = ["1st Class", "2nd Class", "3rd Class"];

async function deleteDocAndSubcollections(docRef) {
  // Check and delete subcollection /sections under this doc
  const subSnap = await docRef.collection('sections').get();
  for (const sDoc of subSnap.docs) {
    await sDoc.ref.delete();
  }
  // Delete doc itself
  await docRef.delete();
}

async function cleanExtraClasses() {
  console.log("=== CLEANING EXTRA & PHANTOM CLASSES FROM FIRESTORE ===");
  console.log("Allowed active classes:", VALID_CLASSES.join(", "));

  // List all docs in /classes collection
  const snap = await db.collection('classes').get();
  console.log(`Found ${snap.docs.length} documents in /classes.`);

  let deletedCount = 0;

  for (const d of snap.docs) {
    if (!VALID_CLASSES.includes(d.id)) {
      console.log(`Deleting extra class doc & subcollections: /classes/${d.id}`);
      await deleteDocAndSubcollections(d.ref);
      deletedCount++;
    }
  }

  // Also check for known phantom names that might not show up in snap.docs if they only have subcollections
  const knownOldNames = [
    "4th Class", "5th Class", "6th Class", "7th Class", "8th Class", "9th Class", "10th Class",
    "class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9", "class10"
  ];

  for (const oldName of knownOldNames) {
    const dRef = db.collection('classes').doc(oldName);
    const subSnap = await dRef.collection('sections').get();
    if (!subSnap.empty || (await dRef.get()).exists) {
      console.log(`Purging phantom class reference: /classes/${oldName}`);
      await deleteDocAndSubcollections(dRef);
      deletedCount++;
    }
  }

  // Verify remaining active classes
  const finalSnap = await db.collection('classes').get();
  console.log("\n=== CLEANUP COMPLETE ===");
  console.log("Remaining classes in /classes:", finalSnap.docs.map(d => d.id).join(", "));
  process.exit(0);
}

cleanExtraClasses().catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
