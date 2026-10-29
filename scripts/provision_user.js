// scripts/provision_user.js
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'yashwanth.32997@gmail.com';
const password = '123456';

async function main() {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password
    });
    console.log('Created user uid:', userRecord.uid);
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      email,
      role: 'worker',
      name: 'Yashwanth',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('User profile created.');
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log('User already exists uid:', existingUser.uid);
      const db = admin.firestore();
      await db.collection('users').doc(existingUser.uid).set({
        email,
        role: 'worker',
        name: 'Yashwanth',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('User profile ensured.');
    } else {
      console.error('Error provisioning user:', error);
    }
  }
}

main();
