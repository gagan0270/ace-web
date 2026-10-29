const admin = require('firebase-admin');

// Initialize administrative SDK
if (admin.apps.length === 0) {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

// ============================================================
// CONFIGURATION
// ============================================================
const DEFAULT_PASSWORD = "student123";
const STUDENTS_PER_SECTION = 10;

// First names pool (mix of boys and girls)
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

// ============================================================
// STEP 1: DELETE ALL EXISTING STUDENTS
// ============================================================
async function deleteAllStudents() {
  console.log("\n========== STEP 1: DELETING ALL EXISTING STUDENTS ==========");
  const studentsSnap = await db.collection('students').get();
  
  if (studentsSnap.empty) {
    console.log("No students to delete. Skipping.");
    return;
  }

  console.log(`Found ${studentsSnap.size} student documents to delete...`);
  
  // Batch delete in groups of 500
  const batches = [];
  let batch = db.batch();
  let count = 0;
  
  for (const doc of studentsSnap.docs) {
    // Also delete subcollections (attendance, notifications)
    try {
      const attSnap = await doc.ref.collection('attendance').get();
      for (const attDoc of attSnap.docs) {
        batch.delete(attDoc.ref);
        count++;
        if (count % 499 === 0) {
          batches.push(batch.commit());
          batch = db.batch();
        }
      }
      
      const notifSnap = await doc.ref.collection('notifications').get();
      for (const notifDoc of notifSnap.docs) {
        batch.delete(notifDoc.ref);
        count++;
        if (count % 499 === 0) {
          batches.push(batch.commit());
          batch = db.batch();
        }
      }
    } catch(e) {}
    
    batch.delete(doc.ref);
    count++;
    if (count % 499 === 0) {
      batches.push(batch.commit());
      batch = db.batch();
    }
  }
  
  batches.push(batch.commit());
  await Promise.all(batches);
  
  console.log(`✅ Deleted ${studentsSnap.size} student documents and their subcollections.`);
}

// ============================================================
// STEP 2: FETCH EXISTING CLASSES AND SECTIONS FROM FIRESTORE
// ============================================================
async function fetchClassesAndSections() {
  console.log("\n========== STEP 2: READING CLASSES & SECTIONS FROM FIRESTORE ==========");

  const classesSnap = await db.collection('classes').orderBy('order').get();
  const classes = [];
  for (const d of classesSnap.docs) {
    classes.push(d.id);
  }
  
  console.log(`Found ${classes.length} classes:`, classes.join(', '));

  const sectionsSnap = await db.collection('sections').get();
  const sectionNames = sectionsSnap.docs.map(d => d.id);
  console.log(`Found ${sectionNames.length} sections in /sections:`, sectionNames.join(', '));

  // Also check for sections stored under classes (subcollections)
  const sectionsByClass = {};
  
  for (const className of classes) {
    const subSnap = await db.collection(`classes/${className}/sections`).get();
    if (!subSnap.empty) {
      sectionsByClass[className] = subSnap.docs.map(d => d.id);
      console.log(`  Class '${className}' has subcollection sections:`, sectionsByClass[className].join(', '));
    } else {
      // Fall back: use the top-level sections for every class
      sectionsByClass[className] = sectionNames.length > 0 ? sectionNames : ["Section A", "Section B", "Section C"];
    }
  }
  
  if (classes.length === 0) {
    console.log("⚠️  No classes found. Using defaults.");
    const defaults = ["1st Class","2nd Class","3rd Class","4th Class","5th Class",
                      "6th Class","7th Class","8th Class","9th Class","10th Class"];
    for (const c of defaults) {
      sectionsByClass[c] = ["Section A", "Section B", "Section C"];
      classes.push(c);
    }
  }
  
  return { classes, sectionsByClass };
}

// ============================================================
// STEP 3: SEED 10 STUDENTS PER SECTION
// ============================================================
async function seedStudents(classes, sectionsByClass) {
  console.log("\n========== STEP 3: SEEDING FRESH STUDENTS ==========");
  
  let globalStudentNum = 1;
  let totalCreated = 0;
  
  for (const className of classes) {
    // e.g. "2nd Class" → "02"
    const classMatch = className.match(/(\d+)/);
    const classNum = classMatch ? String(classMatch[1]).padStart(2, '0') : String(globalStudentNum).padStart(2, '0');
    
    const sections = sectionsByClass[className] || ["Section A", "Section B", "Section C"];
    
    for (const section of sections) {
      // e.g. "Section A" → "A"
      const secLetter = section.replace(/Section\s+/i, '').trim().charAt(0).toUpperCase();
      
      console.log(`\n  🏫 Seeding ${STUDENTS_PER_SECTION} students for ${className} · ${section}...`);
      
      const batch = db.batch();
      
      for (let i = 1; i <= STUDENTS_PER_SECTION; i++) {
        const studentNum = String(i).padStart(2, '0');
        const satsId = `SATS${classNum}${secLetter}${studentNum}`;
        const name = randomName();
        const gender = randomGender();
        
        const studentDoc = {
          satsId,
          name,
          gender,
          class: className,
          section,
          
          // No Bus by default
          assignedBusNumber: "No Bus",
          busAllocated: 0,
          busAllocatedFee: 0,
          
          // Default password
          password: DEFAULT_PASSWORD,
          parentPassword: DEFAULT_PASSWORD,
          studentPassword: DEFAULT_PASSWORD,
          passwordSet: true,
          
          // Force password reset on first login
          mustChangePassword: true,
          forcePasswordReset: true,
          firstLogin: true,
          
          // Status
          status: "active",
          
          // Fee structure defaults
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
              scores: { math: 0, science: 0, english: 0, hindi: 0, social_studies: 0 }
            },
            final: {
              max_marks: 100,
              passing_marks: 35,
              scores: { math: 0, science: 0, english: 0, hindi: 0, social_studies: 0 }
            }
          },
          
          createdAt: ts(),
          lastUpdatedTimestamp: ts(),
          lastUpdatedBy: "seed_script"
        };
        
        const docRef = db.collection('students').doc(satsId);
        batch.set(docRef, studentDoc);
        
        console.log(`    ✅ ${satsId} — ${name} (${gender}, ${className} · ${section})`);
      }
      
      await batch.commit();
      totalCreated += STUDENTS_PER_SECTION;
      console.log(`  ✅ Committed ${STUDENTS_PER_SECTION} students for ${className} · ${section}`);
    }
  }
  
  return totalCreated;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("=============================================================");
  console.log("  ACE SCHOOL — FRESH STUDENT SEED SCRIPT");
  console.log("  Default Password: student123");
  console.log("  Force Password Reset: ON (mustChangePassword: true)");
  console.log("  Bus Default: No Bus");
  console.log("=============================================================");
  
  try {
    // Verify connectivity
    const collections = await db.listCollections();
    console.log("✅ Connected to Firebase Firestore project: ace-school-d725d");
    console.log("   Collections:", collections.map(c => c.id).join(', '));
  } catch (err) {
    console.error("❌ Firebase connection failed:", err);
    process.exit(1);
  }
  
  // Step 1: Delete all existing students
  await deleteAllStudents();
  
  // Step 2: Fetch classes and sections
  const { classes, sectionsByClass } = await fetchClassesAndSections();
  
  // Step 3: Seed 10 students per section
  const totalCreated = await seedStudents(classes, sectionsByClass);
  
  console.log("\n=============================================================");
  console.log(`  ✅ COMPLETE! Created ${totalCreated} fresh student records`);
  console.log(`  🔑 Default password for all: student123`);
  console.log(`  ⚠️  All students flagged: mustChangePassword = true`);
  console.log(`  🚌 All students: Assigned Bus = No Bus`);
  console.log("=============================================================");
  
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});
