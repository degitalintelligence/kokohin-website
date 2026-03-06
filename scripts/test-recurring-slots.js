const fs = require('fs')
const path = require('path')

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = val
  }
  return env
}

async function main() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found')
    process.exit(1)
  }
  const env = parseEnvFile(envPath)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase envs')
    process.exit(1)
  }

  const startDate = '2099-01-01'
  const body = {
    dto: {
      start_date: startDate,
      weeks_ahead: 1,
      pattern: 'weekdays',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '09:00',
      end_time: '10:00',
      capacity: 1,
      is_active: true,
    },
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/create_recurring_survey_slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error('RPC failed:', res.status, text)
    process.exit(1)
  }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error('Failed to parse RPC response:', text)
    process.exit(1)
  }

  const created = Number(json.created_count ?? 0)
  const skipped = Number(json.skipped_conflicts ?? 0)
  if (Number.isNaN(created) || Number.isNaN(skipped)) {
    console.error('Unexpected RPC payload:', json)
    process.exit(1)
  }

  console.log(
    `Recurring slots test: created=${created}, skipped_conflicts=${skipped} (start_date=${startDate})`
  )
  if (created + skipped <= 0) {
    console.error('No slots affected by recurring function, test failed')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Unexpected error in test-recurring-slots:', e)
  process.exit(1)
})

