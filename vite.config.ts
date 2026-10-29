import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local dev middleware: handles /api/update-password without needing Vercel CLI
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: any) {
      server.middlewares.use('/api/update-password', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { email, password } = JSON.parse(body);

            if (!email || !password) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Missing email or password' }));
              return;
            }

            const { default: admin } = await import('firebase-admin');

            if (!admin.apps.length) {
              const serviceAccount = JSON.parse(
                readFileSync(resolve(__dirname, 'firebase-admin-key.json'), 'utf8')
              );
              admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            }

            const auth = admin.auth();

            let uid;
            try {
              const existing = await auth.getUserByEmail(email);
              await auth.updateUser(existing.uid, { password });
              uid = existing.uid;
            } catch (e: any) {
              if (e.code === 'auth/user-not-found') {
                const newUser = await auth.createUser({ email, password });
                uid = newUser.uid;
              } else {
                throw e;
              }
            }

            console.log(`[local-api] Password updated for ${email} (uid: ${uid})`);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Password updated successfully', uid }));
          } catch (err: any) {
            console.error('[local-api] Error updating password:', err.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [localApiPlugin()],
  },
});
