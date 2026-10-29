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

async function initTeachers() {
  console.log("🏫 Initializing root '/teachers' collection...");
  await db.collection("teachers").doc("init_marker").set({
    initialized: true,
    status: "system"
  });
  console.log("✅ Root '/teachers' collection successfully initialized via server hard-write.");
  process.exit(0);
}

initTeachers().catch(console.error);
