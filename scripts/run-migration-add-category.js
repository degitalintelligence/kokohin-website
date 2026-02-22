/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return env;
}

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('File .env.local not found at:', envPath);
  process.exit(1);
}
const env = parseEnvFile(envPath);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

async function executeSql(sql) {
  const url = `${supabaseUrl}/pg/query`;
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is not defined. Please use Node.js 18 or later.');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response;
}

async function runMigration() {
  try {
    const sqlPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20260222_add_category_to_catalogs.sql'
    );
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found at: ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration from:', sqlPath);
    // Send as one statement to preserve DO $$ ... $$ blocks
    await executeSql(sql);
    console.log('Migration completed successfully.')
  } catch (err) {
    console.error('Failed to run migration:', err);
    process.exit(1);
  }
}

runMigration();
