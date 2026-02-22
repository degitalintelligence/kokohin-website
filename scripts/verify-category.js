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
  process.exit(1);
}

async function executeSql(sql) {
  const url = `${supabaseUrl}/pg/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  try {
    const columns = await executeSql(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='catalogs' AND column_name='category'
    `);
    console.log('Column definition:', columns);

    const checkConstraint = await executeSql(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public.catalogs'::regclass AND conname = 'catalogs_category_check'
    `);
    console.log('Check constraint:', checkConstraint);

    const sample = await executeSql(`
      SELECT id, title, category FROM public.catalogs ORDER BY created_at DESC LIMIT 5
    `);
    console.log('Sample catalogs:', sample);
  } catch (e) {
    console.error('Verification failed:', e.message);
    process.exit(1);
  }
}

main();

