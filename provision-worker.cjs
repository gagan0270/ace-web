const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function provisionWorker() {
  const email = 'yashwanth.32997@gmail.com';
  const password = '123456';
  const name = 'Yashwanth';
  const role = 'worker';

  console.log('━'.repeat(52));
  console.log('  ACE School — Worker Account Provisioning Script');
  console.log('━'.repeat(52));
  console.log(`\n👤  Target Email : ${email}`);
  console.log(`🔑  Role         : ${role}`);
  console.log(`📛  Display Name : ${name}\n`);

  // ── Step 1: Create Firebase Auth user ────────────────────────
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
      disabled: false
    });
    console.log(`✅  Auth user created successfully.`);
    console.log(`    UID : ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.log(`⚠️  Auth user already exists — fetching existing UID...`);
      userRecord = await auth.getUserByEmail(email);
      console.log(`    UID : ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  const uid = userRecord.uid;

  // ── Step 2: Write Firestore profile document ──────────────────
  const profileRef = db.collection('users').doc(uid);
  const existing = await profileRef.get();

  if (existing.exists) {
    console.log(`\n⚠️  Firestore profile already exists at /users/${uid}.`);
    console.log(`    Merging/updating fields to ensure sync...`);
    await profileRef.set({
      email,
      role,
      name,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅  Profile document updated at /users/${uid}`);
  } else {
    await profileRef.set({
      email,
      role,
      name,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`\n✅  Firestore profile written at /users/${uid}`);
  }

  // ── Step 3: Verify the final state ───────────────────────────
  const snap = await profileRef.get();
  const data = snap.data();

  console.log('\n━'.repeat(52));
  console.log('  ✨  PROVISIONING COMPLETE — Live Cloud Verification');
  console.log('━'.repeat(52));
  console.log(`  UID    : ${uid}`);
  console.log(`  Email  : ${data.email}`);
  console.log(`  Name   : ${data.name}`);
  console.log(`  Role   : ${data.role}`);
  console.log(`  Status : ${data.status}`);
  console.log('━'.repeat(52));
  console.log('\n🟢  Yashwanth is fully authorized to log in.\n');

  process.exit(0);
}

provisionWorker().catch(err => {
  console.error('\n❌  Provisioning failed:', err.message);
  process.exit(1);
});
