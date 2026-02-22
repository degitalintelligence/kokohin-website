'use strict'

const fs = require('fs')
const path = require('path')
const { performance } = require('perf_hooks')
const { createClient } = require('@supabase/supabase-js')

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

function createAdmin() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env.local')
  }
  const env = parseEnvFile(envPath)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function measure(name, fn, times = 5) {
  const durations = []
  for (let i = 0; i < times; i++) {
    const t0 = performance.now()
    await fn()
    const t1 = performance.now()
    durations.push(t1 - t0)
  }
  durations.sort((a, b) => a - b)
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length
  const p95 = durations[Math.floor(durations.length * 0.95) - 1] ?? durations[durations.length - 1]
  return { name, avg_ms: Math.round(avg), p95_ms: Math.round(p95), runs: durations.map(d => Math.round(d)) }
}

async function main() {
  const supabase = createAdmin()
  const tasks = [
    measure('services_simple', async () => {
      const { error } = await supabase.from('services').select('*').order('order', { ascending: true }).limit(50)
      if (error) throw new Error(error.message)
    }),
    measure('catalogs_with_relations', async () => {
      const { error } = await supabase
        .from('catalogs')
        .select('*, atap:atap_id(name, category), rangka:rangka_id(name, category)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
    }),
    measure('site_settings_read', async () => {
      const { error } = await supabase.from('site_settings').select('key,value').limit(100)
      if (error) throw new Error(error.message)
    }),
    measure('leads_recent', async () => {
      const { error } = await supabase
        .from('leads')
        .select('id,name,phone,status,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
    }),
    measure('erp_projects_with_estimations', async () => {
      const { error } = await supabase
        .from('erp_projects')
        .select('id,status,created_at,estimations(version_number,created_at)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
    }),
  ]
  const results = []
  for (const t of tasks) {
    results.push(await t)
  }
  const maxDefault = Number.parseInt(process.env.PERF_P95_MAX_DEFAULT || '', 10) || 0
  const getMax = (name) => {
    const map = {
      services_simple: process.env.PERF_P95_MAX_SERVICES_SIMPLE,
      catalogs_with_relations: process.env.PERF_P95_MAX_CATALOGS_WITH_RELATIONS,
      site_settings_read: process.env.PERF_P95_MAX_SITE_SETTINGS_READ,
      leads_recent: process.env.PERF_P95_MAX_LEADS_RECENT,
      erp_projects_with_estimations: process.env.PERF_P95_MAX_ERP_PROJECTS_WITH_ESTIMATIONS,
    }
    const v = Number.parseInt(map[name] || '', 10) || 0
    return v > 0 ? v : maxDefault
  }
  const enriched = results.map(r => {
    const th = getMax(r.name)
    return { ...r, threshold_ms: th || null, passed: th ? r.p95_ms <= th : true }
  })
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), results: enriched }, null, 2))
  const failed = enriched.some(r => r.passed === false)
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error(e.message || String(e))
  process.exit(1)
})
