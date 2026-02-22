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

async function executeSql(sql, supabaseUrl, serviceRoleKey) {
  const url = `${supabaseUrl}/pg/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

function isSafeIdent(s) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)
}

async function main() {
  const [schema, table, column] = process.argv.slice(2)
  if (!schema || !table || !column) {
    console.error('Usage: node scripts/verify-column.js <schema> <table> <column>')
    process.exit(2)
  }
  if (![schema, table, column].every(isSafeIdent)) {
    console.error('Identifiers must be alphanumeric/underscore and start with a letter/underscore')
    process.exit(2)
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
    console.error('Env tidak lengkap: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const sql =
    `select 1 from information_schema.columns where table_schema='${schema}' and table_name='${table}' and column_name='${column}' limit 1;`
  const rows = await executeSql(sql, supabaseUrl, serviceRoleKey)
  const exists = Array.isArray(rows) && rows.length > 0
  console.log(JSON.stringify({ schema, table, column, exists }))
}

main().catch(err => {
  console.error(err.message || String(err))
  process.exit(1)
})

