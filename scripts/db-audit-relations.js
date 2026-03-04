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
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

async function main() {
  const fkAndUnique = await executeSql(`
    select
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name as referenced_table,
      ccu.column_name as referenced_column,
      rc.delete_rule
    from information_schema.table_constraints tc
    left join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    left join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    left join information_schema.referential_constraints rc
      on rc.constraint_name = tc.constraint_name
     and rc.constraint_schema = tc.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'erp_customer_profiles'
      and tc.constraint_type in ('FOREIGN KEY', 'UNIQUE')
    order by tc.constraint_type, tc.constraint_name;
  `)

  const triggerDef = await executeSql(`
    select
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'sync_lead_to_customer_profile';
  `)

  const triggerBinding = await executeSql(`
    select
      t.tgname as trigger_name,
      c.relname as table_name,
      pg_get_triggerdef(t.oid, true) as trigger_def
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'leads'
      and not t.tgisinternal
    order by t.tgname;
  `)

  const quotationRel = await executeSql(`
    select
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name as referenced_table,
      rc.delete_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    left join information_schema.referential_constraints rc
      on rc.constraint_name = tc.constraint_name
     and rc.constraint_schema = tc.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'erp_quotations'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'lead_id';
  `)

  const auditAt = new Date().toISOString()
  const complianceReport = {
    audited_at: auditAt,
    checks: {
      erp_customer_profiles_constraints: fkAndUnique,
      sync_function_definition: triggerDef,
      leads_trigger_binding: triggerBinding,
      quotation_lead_relation: quotationRel
    }
  }

  const docsDir = path.join(__dirname, '..', 'docs')
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true })
  const jsonPath = path.join(docsDir, 'erp-relation-audit-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(complianceReport, null, 2))

  const firstFk = fkAndUnique.find(r => r.constraint_name === 'erp_customer_profiles_lead_id_fkey')
  const hasUniqueLead = fkAndUnique.some(r => r.constraint_name === 'erp_customer_profiles_lead_id_unique')
  const firstQuotationRel = quotationRel[0] || null
  const triggerName = triggerBinding[0]?.trigger_name || '-'
  const functionName = triggerDef[0]?.function_name || '-'

  const markdown = [
    '# ERP Relation Compliance Report',
    '',
    `Audit time: ${auditAt}`,
    '',
    '## Ringkasan',
    '',
    `- FK erp_customer_profiles.lead_id: ${firstFk ? `${firstFk.constraint_name} (ON DELETE ${firstFk.delete_rule})` : 'tidak ditemukan'}`,
    `- Unique lead profile: ${hasUniqueLead ? 'erp_customer_profiles_lead_id_unique' : 'tidak ditemukan'}`,
    `- Trigger leads: ${triggerName}`,
    `- Function sinkronisasi: ${functionName}`,
    `- FK erp_quotations.lead_id: ${firstQuotationRel ? `${firstQuotationRel.constraint_name} (ON DELETE ${firstQuotationRel.delete_rule})` : 'tidak ditemukan'}`,
    '',
    '## Detail JSON',
    '',
    `- Lihat file JSON: docs/erp-relation-audit-report.json`
  ].join('\n')

  const mdPath = path.join(docsDir, 'ERP_RELATION_COMPLIANCE_REPORT.md')
  fs.writeFileSync(mdPath, markdown)

  console.log('\n=== FK & UNIQUE erp_customer_profiles ===')
  console.log(JSON.stringify(fkAndUnique, null, 2))

  console.log('\n=== Function Definition sync_lead_to_customer_profile ===')
  console.log(JSON.stringify(triggerDef, null, 2))

  console.log('\n=== Trigger di tabel leads ===')
  console.log(JSON.stringify(triggerBinding, null, 2))

  console.log('\n=== Relasi erp_quotations.lead_id ===')
  console.log(JSON.stringify(quotationRel, null, 2))
  console.log(`\nReport JSON: ${jsonPath}`)
  console.log(`Report Markdown: ${mdPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
