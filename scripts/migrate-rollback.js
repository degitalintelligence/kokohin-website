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

async function main() {
  const dir = path.join(__dirname, '..', 'supabase', 'migrations_down')
  if (!fs.existsSync(dir)) {
    console.error('Folder supabase/migrations_down tidak ditemukan')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const target = args[0] // e.g. "014" to rollback this and later migrations
  if (!target) {
    console.error('Usage: node scripts/migrate-rollback.js <prefix-number>')
    process.exit(1)
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql') && f.startsWith(target)).sort().reverse()
  if (files.length === 0) {
    console.error(`Tidak ditemukan down scripts dengan prefix ${target}`)
    process.exit(1)
  }

  console.log('Menjalankan rollback untuk:', files)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`- Rollback ${file} ...`)
    try {
      await executeSql(`begin; ${sql}\ncommit;`)
      console.log(`  ✓ Sukses: ${file}`)
    } catch (e) {
      console.error(`  ✗ Gagal rollback ${file}:`, e.message)
      try { await executeSql('rollback;') } catch {}
      process.exit(1)
    }
  }

  console.log('\n✅ Rollback selesai.')
}

main()

