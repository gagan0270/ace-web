#!/usr/bin/env node
// vercel-deploy.mjs — Fixed for Windows + scope-required accounts

import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const tokenIdx = args.indexOf('--token');
const TOKEN = tokenIdx !== -1 ? args[tokenIdx + 1] : process.env.VERCEL_TOKEN;
const SCOPE = 'gagan00270-6392s-projects'; // discovered from first run
const PROJECT = 'ace-web';

const tokenFlag = TOKEN ? `--token ${TOKEN}` : '';

// Read .env
const envPath = resolve(__dirname, '.env');
const envRaw = readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (key) envVars[key] = val;
}

// Read firebase-admin-key.json and inject admin credentials securely
try {
  const adminKeyPath = resolve(__dirname, 'firebase-admin-key.json');
  const adminKeyRaw = readFileSync(adminKeyPath, 'utf8');
  const adminKey = JSON.parse(adminKeyRaw);
  if (adminKey.project_id) {
    envVars['FIREBASE_PROJECT_ID'] = adminKey.project_id;
    envVars['FIREBASE_CLIENT_EMAIL'] = adminKey.client_email;
    // Replace physical newlines with \n for env injection
    envVars['FIREBASE_PRIVATE_KEY'] = adminKey.private_key.replace(/\n/g, '\\n');
  }
} catch (err) {
  console.warn("⚠️  Could not read firebase-admin-key.json. Vercel Auth API may fail without these variables.");
}

console.log('\n🚀  ACE Web — Vercel Production Deployment');
console.log('━'.repeat(50));
console.log(`📁  Scope:   ${SCOPE}`);
console.log(`📦  Project: ${PROJECT}`);
console.log(`🔑  Env vars found: ${Object.keys(envVars).length}`);
Object.keys(envVars).forEach(k => console.log(`    • ${k}`));
console.log('');

const run = (cmd) => {
  console.log(`▶  ${TOKEN ? cmd.replace(TOKEN, '***TOKEN***') : cmd}`);
  const result = spawnSync(cmd, { shell: true, cwd: __dirname, stdio: 'inherit' });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(`Command exited with code ${result.status}`);
  }
};

// ─── Step 1: Link project ─────────────────────────────────────────────────
console.log('\n📎  Step 1: Linking project to Vercel...');
run(`npx vercel link ${tokenFlag} --scope ${SCOPE} --project ${PROJECT} --yes`);

// ─── Step 2: Inject env vars via Vercel REST API ─────────────────────────
console.log('\n🔐  Step 2: Injecting environment variables via REST API...');

// Use Vercel REST API to get project ID first
const projectInfoRaw = execSync(
  `npx vercel project ls ${tokenFlag} --scope ${SCOPE}`,
  { cwd: __dirname, encoding: 'utf8' }
);
console.log('    Resolved project scope ✅');

// Inject each var using vercel env add with a temp file (avoids Windows stdin issues)
const { writeFileSync, unlinkSync } = await import('fs');
const tmpFile = resolve(__dirname, '.vercel-env-tmp');

for (const [key, val] of Object.entries(envVars)) {
  try {
    // Remove existing (suppress errors)
    spawnSync(
      `npx vercel env rm ${key} production ${tokenFlag} --scope ${SCOPE} --yes`,
      { shell: true, cwd: __dirname, stdio: 'pipe' }
    );
  } catch {}

  // Write value to temp file, pipe it in
  writeFileSync(tmpFile, val, 'utf8');
  const addResult = spawnSync(
    `npx vercel env add ${key} production ${tokenFlag} --scope ${SCOPE}`,
    {
      shell: true,
      cwd: __dirname,
      stdio: ['pipe', 'inherit', 'inherit'],
      input: val + '\n'
    }
  );

  if (addResult.status === 0) {
    console.log(`    ✅  ${key}`);
  } else {
    console.warn(`    ⚠️  ${key} — may already exist or had an error (continuing)`);
  }
}

try { unlinkSync(tmpFile); } catch {}

// ─── Step 3: Deploy to production ────────────────────────────────────────
console.log('\n🌐  Step 3: Deploying to production...');
run(`npx vercel --prod --force ${tokenFlag} --scope ${SCOPE} --yes`);

console.log('\n✨  Deployment complete! Your live URL is shown above ☝️');
