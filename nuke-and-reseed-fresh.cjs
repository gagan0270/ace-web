const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();
const ts = admin.firestore.FieldValue.serverTimestamp;

const DEFAULT_PASSWORD = "123456";
const TARGET_CLASSES = ["1st Class", "2nd Class", "3rd Class"];
const TARGET_SECTIONS = ["Section A", "Section B"];
const STUDENTS_PER_SECTION = 10;

const FIRST_NAMES = [
  "Aarav", "Aanya", "Advait", "Ananya", "Arjun", "Avani",
  "Chirag", "Diya", "Dev", "Esha", "Farhan", "Gauri",
  "Harsh", "Ishita", "Ishan", "Jiya", "Kabir", "Kavya",
  "Krish", "Lakshmi", "Mihir", "Meera", "Naveen", "Nisha",
  "Om", "Pooja", "Pranav", "Priya", "Rahul", "Riya",
  "Rohan", "Saanvi", "Sarthak", "Sneha", "Tanmay", "Tanvi",
  "Uday", "Uma", "Vikas", "Vidya", "Vivek", "Yamini",
  "Zaid", "Zara", "Aaditya", "Aishwarya", "Akshat", "Alka",
  "Amit", "Amita", "Ankit", "Ankita", "Arnav", "Archana",
  "Ayaan", "Ayushi", "Bhavesh", "Bhavna", "Chinmay", "Charu"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Nair",
  "Reddy", "Mehta", "Joshi", "Verma", "Rao", "Shah",
  "Mishra", "Iyer", "Kapoor", "Chandra", "Bose", "Das"
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomGender() {
  return Math.random() > 0.5 ? "Male" : "Female";
}

async function nukeCollection(collPath) {
  console.log(`Deleting all documents in '${collPath}'...`);
  const snap = await db.collection(collPath).get();
  if (snap.empty) return;

  const batches = [];
  let batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 450 === 0) {
      batches.push(batch.commit());
      batch = db.batch();
    }
  }
  batches.push(batch.commit());
  await Promise.all(batches);
  console.log(`  ✅ Deleted ${snap.size} docs from '${collPath}'`);
}

async function main() {
  console.log("=============================================================");
  console.log("  ACE SCHOOL — FULL WIPE & FRESH RESEED SCRIPT");
  console.log("  Default Password for all: 123456");
  console.log("  Classes: 1st Class, 2nd Class, 3rd Class (2 sections each)");
  console.log("  Students per section: 10 (Total 60 students)");
  console.log("=============================================================\n");

  // STEP 1: NUKE ALL EXISTING DATA
  console.log("========== STEP 1: WIPING EXISTING FIRESTORE DATA ==========");
  await nukeCollection('students');
  await nukeCollection('classes');
  await nukeCollection('sections');
  await nukeCollection('fee_structures');
  await nukeCollection('notices');
  await nukeCollection('events');
  await nukeCollection('parent_alerts');

  // STEP 2: CREATE 3 CLASSES & 2 SECTIONS
  console.log("\n========== STEP 2: CREATING 3 CLASSES & 2 SECTIONS ==========");
  for (let i = 0; i < TARGET_CLASSES.length; i++) {
    const className = TARGET_CLASSES[i];
    await db.collection('classes').doc(className).set({
      name: className,
      order: i + 1,
      status: "active",
      createdAt: ts(),
      lastUpdated: ts()
    });
    console.log(`  🏫 Created Class: ${className}`);

    for (const sectionName of TARGET_SECTIONS) {
      await db.collection(`classes/${className}/sections`).doc(sectionName).set({
        name: sectionName,
        className: className,
        status: "active",
        createdAt: ts()
      });
    }
  }

  for (const sectionName of TARGET_SECTIONS) {
    await db.collection('sections').doc(sectionName).set({
      name: sectionName,
      status: "active",
      lastUpdated: ts()
    });
    console.log(`  📐 Configured Root Section: ${sectionName}`);
  }

  // STEP 3: SEED 60 FRESH STUDENTS (SATS01A01 - SATS03B10)
  console.log("\n========== STEP 3: SEEDING FRESH STUDENTS & FIREBASE AUTH ==========");
  let totalCreated = 0;

  for (let cIdx = 0; cIdx < TARGET_CLASSES.length; cIdx++) {
    const className = TARGET_CLASSES[cIdx];
    const classNum = String(cIdx + 1).padStart(2, '0'); // "01", "02", "03"

    for (const sectionName of TARGET_SECTIONS) {
      const secLetter = sectionName.replace(/Section\s+/i, '').trim().charAt(0).toUpperCase(); // "A", "B"
      console.log(`\n  🏫 Creating 10 students for ${className} · ${sectionName}...`);

      const batch = db.batch();

      for (let sIdx = 1; sIdx <= STUDENTS_PER_SECTION; sIdx++) {
        const seqNum = String(sIdx).padStart(2, '0'); // "01" to "10"
        const satsId = `SATS${classNum}${secLetter}${seqNum}`;
        const name = randomName();
        const gender = randomGender();

        const studentData = {
          satsId,
          name,
          gender,
          class: className,
          section: sectionName,
          assignedBusNumber: "No Bus",
          busAllocated: 0,
          busAllocatedFee: 0,

          password: DEFAULT_PASSWORD,
          passwordSet: true,
          mustChangePassword: true,
          forcePasswordReset: true,
          firstLogin: true,

          status: "active",
          totalAllocatedFee: 50000,
          totalAllocated: 50000,
          totalPaidFee: 0,
          totalPaid: 0,
          outstandingBalance: 50000,

          fees: {
            schoolAllocated: 50000,
            totalAllocated: 50000,
            schoolPaid: 0,
            totalPaid: 0,
            busAllocated: 0,
            busPaid: 0,
            payments: []
          },

          marks: {
            midterm: {
              max_marks: 100,
              passing_marks: 35,
              scores: { math: 80, science: 75, english: 85 }
            },
            final: {
              max_marks: 100,
              passing_marks: 35,
              scores: { math: 85, science: 80, english: 90 }
            }
          },

          createdAt: ts(),
          lastUpdatedTimestamp: ts()
        };

        batch.set(db.collection('students').doc(satsId), studentData);

        // SYNC TO FIREBASE AUTHENTICATION
        const authEmail = `${satsId.toLowerCase()}@ace.school`;
        try {
          let userRecord;
          try {
            userRecord = await auth.getUserByEmail(authEmail);
          } catch (e) {
            userRecord = null;
          }

          if (userRecord) {
            await auth.updateUser(userRecord.uid, {
              password: DEFAULT_PASSWORD,
              disabled: false
            });
          } else {
            await auth.createUser({
              email: authEmail,
              password: DEFAULT_PASSWORD,
              displayName: name,
              disabled: false
            });
          }
        } catch (authErr) {
          console.warn(`  ⚠️ Auth sync warning for ${satsId}:`, authErr.message);
        }

        console.log(`    ✅ ${satsId} — ${name} (${className} · ${sectionName}) [Password: ${DEFAULT_PASSWORD}]`);
        totalCreated++;
      }

      await batch.commit();
    }
  }

  console.log("\n=============================================================");
  console.log(`  ✅ WIPE & RESEED COMPLETE! Created ${totalCreated} fresh students`);
  console.log(`  🏫 3 Classes: 1st Class, 2nd Class, 3rd Class`);
  console.log(`  📐 2 Sections per Class: Section A, Section B`);
  console.log(`  🔑 Default password for ALL students: ${DEFAULT_PASSWORD}`);
  console.log(`  ⚠️  mustChangePassword: true (Forces password reset on login)`);
  console.log(`  🚌 Assigned Bus: No Bus (Bus fee = ₹0)`);
  console.log(`  💰 School Tuition Fee: ₹50,000`);
  console.log(`  🆔 SATS IDs range: SATS01A01 to SATS03B10`);
  console.log("=============================================================");

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Reseed error:", err);
  process.exit(1);
});
