/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.substring(0, eq).trim()
    const value = trimmed.substring(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local tidak ditemukan')
  process.exit(1)
}
const env = parseEnvFile(envPath)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Env NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local')
  process.exit(1)
}

async function executeSql(sql) {
  const url = `${supabaseUrl}/pg/query`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

function escapeLiteral(str) {
  return String(str).replace(/'/g, "''")
}

async function ensureHistoryTable() {
  await executeSql(`
    create table if not exists public.migration_history (
      id bigserial primary key,
      filename text not null unique,
      executed_at timestamptz not null default now()
    );
  `)
}

async function main() {
  await ensureHistoryTable()
  const dir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  console.log('Bootstrapping migration_history for files:', files.length)
  for (const f of files) {
    await executeSql(`insert into public.migration_history (filename) values ('${escapeLiteral(f)}') on conflict (filename) do nothing;`)
  }
  console.log('✓ migration_history tersinkron.')
}

main()

