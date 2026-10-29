import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Singleton initializer — safe for Vercel Lambda warm-start reuse
function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    try {
      // Local development fallback — read firebase-admin-key.json from project root
      const serviceAccountPath = resolve(__dirname, '..', 'firebase-admin-key.json');
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      throw new Error(
        `Missing Firebase Admin env vars and failed to load local firebase-admin-key.json: ${err.message}`
      );
    }
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

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const app = getAdminApp();
    const auth = admin.auth(app);

    // Find user by email, update password, and invalidate active refresh tokens/sessions
    const userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { password });
    await auth.revokeRefreshTokens(userRecord.uid);

    return res.status(200).json({
      success: true,
      message: 'Password updated and active sessions invalidated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ error: error.message });
  }
}
