#!/usr/bin/env node
/**
 * database-reset-seeder.cjs
 * DevOps & DB Admin Script to reset and seed the Firestore database.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.resolve(__dirname, "../firebase-admin-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌  Error: firebase-admin-key.json not found at " + serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to batch-delete a collection/query
async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteCollection(collectionPath) {
  console.log(`🧹  Purging collection: ${collectionPath}`);
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(100);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function runResetAndSeed() {
  try {
    console.log("⚡  Starting DevOps Database Reset & Seeding Procedure...");

    // 1. Purge root /students
    await deleteCollection("students");
    console.log("✅  Root '/students' collection completely purged.");

    // Create an array to hold all deletion promises
    const deletionPromises = [];
    
    // Explicitly target phantom legacy classes ('class1' through 'class10')
    console.log("🧹  Purging legacy phantom 'class[X]' documents...");
    for (let i = 1; i <= 10; i++) {
      const classId = `class${i}`;
      const sectionsSnapshot = await db.collection("classes").doc(classId).collection("sections").get();
      if (!sectionsSnapshot.empty) {
        const sectionBatch = db.batch();
        sectionsSnapshot.docs.forEach((doc) => {
          sectionBatch.delete(doc.ref);
        });
        deletionPromises.push(sectionBatch.commit());
      }
      // Delete parent phantom class doc
      deletionPromises.push(db.collection("classes").doc(classId).delete());
    }

    // Now purge any remaining visible documents in '/classes'
    console.log("🧹  Purging visible '/classes' and nested '/sections' sub-collections...");
    const classesSnapshot = await db.collection("classes").get();
    
    for (const classDoc of classesSnapshot.docs) {
      const classId = classDoc.id;
      
      // Purge all nested sections sub-collection
      const sectionsSnapshot = await db.collection("classes").doc(classId).collection("sections").get();
      if (!sectionsSnapshot.empty) {
        const sectionBatch = db.batch();
        sectionsSnapshot.docs.forEach((doc) => {
          sectionBatch.delete(doc.ref);
        });
        deletionPromises.push(sectionBatch.commit());
      }
      
      // Delete parent class doc
      deletionPromises.push(db.collection("classes").doc(classId).delete());
    }
    
    // Explicitly await ALL deletions before moving forward
    await Promise.all(deletionPromises);
    console.log("✅  All existing '/classes' and nested '/sections' purged.");

    // 3. Initialize exactly 3 production class documents and sections
    const targetClasses = ["2nd Class", "3rd Class", "4th Class"];
    const targetSections = ["Section A", "Section B", "Section C", "Section D"];

    console.log("🏗️  Initializing new classes and sub-collection sections...");
    for (const className of targetClasses) {
      const classDocRef = db.collection("classes").doc(className);
      await classDocRef.set({
        name: className,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      for (const sectionName of targetSections) {
        await classDocRef.collection("sections").doc(sectionName).set({
          name: sectionName,
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    console.log("✅  Successfully initialized 3 Classes and 4 Sections per Class.");

    console.log("🏫  Initializing root '/teachers' collection...");
    await db.collection("teachers").doc("_init_").set({
      name: "SYSTEM_INIT",
      status: "system"
    });
    console.log("✅  Root '/teachers' collection initialized.");

    // 4. Seed exactly 10 students per section (120 total students)
    console.log("🎓  Generating and seeding 120 structured student profiles...");
    let studentBatch = db.batch();
    let totalSeeded = 0;

    const classMapping = {
      "2nd Class": { code: "02", label: "2ND" },
      "3rd Class": { code: "03", label: "3RD" },
      "4th Class": { code: "04", label: "4TH" }
    };

    const sectionMapping = {
      "Section A": "A",
      "Section B": "B",
      "Section C": "C",
      "Section D": "D"
    };

    for (const className of targetClasses) {
      const classCode = classMapping[className].code;
      const classLabel = classMapping[className].label;

      for (const sectionName of targetSections) {
        const sectionLetter = sectionMapping[sectionName];

        for (let i = 1; i <= 10; i++) {
          const paddedNum = String(i).padStart(2, "0");
          const satsId = `SATS${classCode}${sectionLetter}${paddedNum}`;
          
          const email = `${satsId.toLowerCase()}@ace.school`;
          const password = "demo@123";
          const uid = `Parent-${satsId}`;

          try {
            await admin.auth().createUser({
              uid: uid,
              email: email,
              password: password
            });
          } catch (err) {
            if (err.code === "auth/email-already-exists" || err.code === "auth/uid-already-exists") {
              await admin.auth().updateUser(uid, { password: password });
            }
          }

          const studentDocRef = db.collection("students").doc(satsId);
          
          const studentData = {
            satsId: satsId,
            name: `STUDENT ${classLabel} CLASS ${sectionLetter} ${i}`,
            class: className,
            section: sectionName,
            status: "active",
            assignedBusNumber: "Bus-101",
            parentAccountUid: uid,
            parentEmail: email,
            mustChangePassword: true,
            fees: {
              totalAllocated: 50000,
              totalPaid: 0
            },
            outstandingBalance: 50000,
            totalAllocated: 50000,
            totalPaid: 0,
            marks: {},
            lastUpdatedBy: "DevOps Seeding Engine",
            lastUpdatedTimestamp: new Date().toISOString()
          };

          studentBatch.set(studentDocRef, studentData);
          totalSeeded++;

          // Commit in batches of 100
          if (totalSeeded % 100 === 0) {
            await studentBatch.commit();
            console.log(`    Seeded ${totalSeeded} students...`);
            studentBatch = db.batch();
          }
        }
      }
    }

    // Commit remainder
    if (totalSeeded % 100 !== 0) {
      await studentBatch.commit();
    }
    
    console.log(`🎉  Seeding Complete! Successfully generated exactly ${totalSeeded} students.`);
    process.exit(0);

  } catch (error) {
    console.error("❌  Database reset and seed procedure failed:", error);
    process.exit(1);
  }
}

runResetAndSeed();
