const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
  return env;
}

const envPath = path.join(__dirname, '..', '.env.local');
const env = parseEnvFile(envPath);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const file = path.join(__dirname, '..', 'supabase', 'migrations', '20260222_drop_qty_per_m2_from_catalog_addons.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const res = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  console.log('Migration executed:', file);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

