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

const EXPECTED = {
  services: {
    columns: {
      id: 'uuid',
      name: 'text',
      slug: 'text',
      description: 'text',
      image_url: 'text',
      icon: 'text',
      order: 'integer',
      is_active: 'boolean',
      meta_title: 'text',
      meta_description: 'text',
      meta_keywords: 'text'
    }
  },
  site_settings: {
    columns: {
      key: 'text',
      value: 'text'
    },
    notes: 'Expect row with key=wa_number present'
  },
  erp_projects: { columns: { id: 'uuid' } },
  estimations: { columns: { id: 'uuid', project_id: 'uuid', version_number: 'integer' } }
}

async function getColumns(schema, table) {
  const rows = await executeSql(`
    select column_name, data_type
    from information_schema.columns
    where table_schema='${schema}' and table_name='${table}'
    order by ordinal_position
  `)
  const result = {}
  for (const r of rows) result[r.column_name] = r.data_type
  return result
}

async function getFkRelations(schema, table) {
  const rows = await executeSql(`
    select
      tc.constraint_name, kcu.column_name, ccu.table_name as foreign_table, ccu.column_name as foreign_column
    from information_schema.table_constraints as tc
    join information_schema.key_column_usage as kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.constraint_column_usage as ccu on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema='${schema}' and tc.table_name='${table}';
  `)
  return rows
}

async function main() {
  const report = { tables: {}, foreignKeys: {}, checks: [] }

  for (const tbl of Object.keys(EXPECTED)) {
    const cols = await getColumns('public', tbl).catch(() => ({}))
    report.tables[tbl] = cols

    if (EXPECTED[tbl].columns) {
      const expectedCols = EXPECTED[tbl].columns
      for (const [col, type] of Object.entries(expectedCols)) {
        if (!(col in cols)) {
          report.checks.push({ table: tbl, column: col, ok: false, message: `Missing column ${col}` })
        } else if (type && cols[col] !== type) {
          report.checks.push({ table: tbl, column: col, ok: false, message: `Type mismatch for ${col}: expected ${type}, got ${cols[col]}` })
        } else {
          report.checks.push({ table: tbl, column: col, ok: true })
        }
      }
    }

    const fks = await getFkRelations('public', tbl).catch(() => [])
    report.foreignKeys[tbl] = fks
  }

  const outDir = path.join(__dirname, '..', 'docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  const outPath = path.join(outDir, 'db-sync-report.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log('Report saved to', outPath)

  const anyFail = report.checks.some(c => !c.ok)
  if (anyFail) {
    console.error('Discrepancies found. See report.')
    process.exit(1)
  }
  console.log('Perfect sync detected for expected subset.')
}

main()

