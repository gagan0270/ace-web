const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize administrative SDK
const serviceAccount = require('./firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  console.log("Reading firestore.rules...");
  const rulesPath = path.join(__dirname, 'firestore.rules');
  const rulesSource = fs.readFileSync(rulesPath, 'utf8');

  console.log("Deploying security rules programmatically to Firestore...");
  const securityRules = admin.securityRules();
  const ruleset = await securityRules.createRulesetFromSource(rulesSource);
  await securityRules.releaseFirestoreRuleset(ruleset);
  console.log("Firestore Security Rules successfully updated on the live Firebase cloud instance!");
  process.exit(0);
}

run().catch(err => {
  console.error("Rules deployment failed:", err);
  process.exit(1);
});
