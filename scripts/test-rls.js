/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
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

const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local tidak ditemukan')
  process.exit(1)
}
const env = parseEnvFile(envPath)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Env NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local')
  process.exit(1)
}

async function run() {
  const publicClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const results = []

  // Public should be able to read services
  const { data: publicServices, error: publicReadErr } = await publicClient.from('services').select('id, name').limit(1)
  results.push({ check: 'public_select_services', ok: !!publicServices && !publicReadErr, error: publicReadErr?.message })

  // Public should NOT be able to insert into services
  const { error: publicInsertErr } = await publicClient.from('services').insert({ name: 'X', slug: 'x' })
  results.push({ check: 'public_insert_services_blocked', ok: !!publicInsertErr, error: publicInsertErr?.message })

  // Admin (service role) should be able to insert/update/delete services
  const { data: insSvc, error: insErr } = await adminClient.from('services').insert({ name: 'RLS Test', slug: 'rls-test', order: 99, is_active: true }).select('*').maybeSingle()
  results.push({ check: 'admin_insert_services', ok: !!insSvc && !insErr, error: insErr?.message })

  let updErr = null
  if (insSvc) {
    const { error } = await adminClient.from('services').update({ name: 'RLS Test Updated' }).eq('id', insSvc.id)
    updErr = error
  }
  results.push({ check: 'admin_update_services', ok: !updErr, error: updErr?.message })

  let delErr = null
  if (insSvc) {
    const { error } = await adminClient.from('services').delete().eq('id', insSvc.id)
    delErr = error
  }
  results.push({ check: 'admin_delete_services', ok: !delErr, error: delErr?.message })

  // Site settings: public read but update should be restricted
  const { data: waRow, error: waReadErr } = await publicClient.from('site_settings').select('key,value').eq('key', 'wa_number').maybeSingle()
  results.push({ check: 'public_select_site_settings', ok: !!waRow && !waReadErr, error: waReadErr?.message })
  const { data: updRows, error: waUpdateErr } = await publicClient
    .from('site_settings')
    .update({ value: '620000000000' })
    .eq('key', 'wa_number')
    .select('key')
  const blocked = !!waUpdateErr || (Array.isArray(updRows) && updRows.length === 0)
  results.push({ check: 'public_update_site_settings_blocked', ok: blocked, error: waUpdateErr?.message })

  console.log(JSON.stringify(results, null, 2))
  const allOk = results.every(r => r.ok)
  if (!allOk) process.exit(1)
}

run()
