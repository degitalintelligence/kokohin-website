import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local tidak ditemukan')
  process.exit(1)
}

const env = parseEnvFile(envPath)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Env NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

async function run() {
  const now = Date.now()
  const phone = `0896${String(now).slice(-8)}`
  const randomSuffix = String(now).slice(-6)

  let { data: anyEstimation } = await admin.from('estimations').select('id').limit(1).maybeSingle()
  let createdFallbackEstimationId = null
  let createdFallbackProjectPhone = null

  const { data: lead, error: leadError } = await admin
    .from('leads')
    .insert({
      name: `IT Customer ${randomSuffix}`,
      phone,
      location: 'Alamat Integrasi 123',
      status: 'new'
    })
    .select('id')
    .single()
  if (leadError || !lead) throw new Error(`Gagal membuat lead: ${leadError?.message}`)

  const leadId = lead.id

  if (!anyEstimation?.id) {
    const { data: project, error: projectError } = await admin
      .from('erp_projects')
      .insert({
        customer_name: `IT Project ${randomSuffix}`,
        phone,
        address: 'Alamat Integrasi 123',
        status: 'New'
      })
      .select('id')
      .single()
    if (projectError || !project) throw new Error(`Gagal membuat project fallback: ${projectError?.message}`)

    const { data: createdEstimation, error: estimationError } = await admin
      .from('estimations')
      .insert({
        project_id: project.id,
        lead_id: leadId,
        version_number: 1,
        total_hpp: 0,
        margin_percentage: 30,
        total_selling_price: 0,
        status: 'draft'
      })
      .select('id')
      .single()
    if (estimationError || !createdEstimation) {
      throw new Error(`Gagal membuat estimation fallback: ${estimationError?.message}`)
    }
    anyEstimation = createdEstimation
    createdFallbackEstimationId = createdEstimation.id
    createdFallbackProjectPhone = phone
  }

  const { error: profileError } = await admin
    .from('erp_customer_profiles')
    .upsert({
      phone,
      name: `IT Customer ${randomSuffix}`,
      lead_id: leadId,
      address: 'Alamat Integrasi 123'
    }, { onConflict: 'phone' })
  if (profileError) throw new Error(`Gagal upsert customer profile: ${profileError.message}`)

  const q1Number = `QTN-IT-${randomSuffix}-A`
  const q2Number = `QTN-IT-${randomSuffix}-B`
  const basePayload = {
    estimation_id: anyEstimation.id,
    lead_id: leadId,
    total_amount: 1230000,
    status: 'draft'
  }

  const { data: q1, error: q1Error } = await admin
    .from('erp_quotations')
    .insert({ ...basePayload, quotation_number: q1Number })
    .select('id')
    .single()
  if (q1Error || !q1) throw new Error(`Gagal membuat quotation 1: ${q1Error?.message}`)

  const { data: q2, error: q2Error } = await admin
    .from('erp_quotations')
    .insert({ ...basePayload, quotation_number: q2Number })
    .select('id')
    .single()
  if (q2Error || !q2) throw new Error(`Gagal membuat quotation 2: ${q2Error?.message}`)

  const { count: quoteCount, error: countError } = await admin
    .from('erp_quotations')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
  if (countError) throw new Error(`Gagal verifikasi one-to-many quotations: ${countError.message}`)
  if ((quoteCount || 0) < 2) throw new Error('Relasi one-to-many lead -> quotations tidak tervalidasi')

  const { error: deleteQuoteError } = await admin
    .from('erp_quotations')
    .delete()
    .eq('id', q1.id)
  if (deleteQuoteError) throw new Error(`Gagal menghapus quotation tanpa hapus profile: ${deleteQuoteError.message}`)

  const { data: profileAfterDelete, error: profileAfterDeleteError } = await admin
    .from('erp_customer_profiles')
    .select('phone, lead_id')
    .eq('phone', phone)
    .maybeSingle()
  if (profileAfterDeleteError) throw new Error(`Gagal cek profile setelah delete quote: ${profileAfterDeleteError.message}`)
  if (!profileAfterDelete) throw new Error('Profile customer hilang setelah delete quotation')

  await admin.from('erp_quotations').delete().eq('id', q2.id)
  if (createdFallbackEstimationId) {
    await admin.from('estimations').delete().eq('id', createdFallbackEstimationId)
  }
  if (createdFallbackProjectPhone) {
    await admin.from('erp_projects').delete().eq('phone', createdFallbackProjectPhone)
  }
  await admin.from('erp_customer_profiles').delete().eq('phone', phone)
  await admin.from('leads').delete().eq('id', leadId)

  console.log('✅ PASS: integration one-to-many customer-quotations and safe quote delete')
}

run().catch((error) => {
  console.error('❌ FAIL:', error)
  process.exit(1)
})
