import admin from 'firebase-admin';

// Singleton initializer — safe for Vercel Lambda warm-start reuse
function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase Admin env vars. Got: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}. ` +
      `Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in Vercel project settings.`
    );
  }

  // Unescape newlines — Vercel stores \\n as literal backslash-n
  privateKey = privateKey.replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const app = getAdminApp();
    const auth = admin.auth(app);

    // Create the user
    const userRecord = await auth.createUser({ email, password });

    if (role) {
      await auth.setCustomUserClaims(userRecord.uid, { role });
    }

    return res.status(200).json({
      success: true,
      message: 'User created successfully',
      uid: userRecord.uid,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (
      error.code === 'auth/email-already-exists' ||
      error.code === 'auth/email-already-in-use'
    ) {
      return res.status(400).json({
        error: 'This Custom User ID is already taken. Please try a different ID combination!',
      });
    }
    return res.status(500).json({ error: error.message });
  }
}
