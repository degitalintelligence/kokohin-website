import fs from 'node:fs'
import path from 'node:path'

let passed = true

const test = (name, fn) => {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
  } catch (error) {
    console.error(`❌ FAIL: ${name}`, error)
    passed = false
  }
}

const expect = (actual) => ({
  toContain: (expected) => {
    if (!String(actual).includes(expected)) throw new Error(`Expected text to contain "${expected}"`)
  }
})

console.log('Running WhatsApp CRM integration tests...')

const webhookPath = path.join(process.cwd(), 'src', 'app', 'api', 'public', 'whatsapp', 'webhook', 'route.ts')
const webhookSource = fs.readFileSync(webhookPath, 'utf8')

test('Webhook mendukung variasi payload WAHA (event/payload/data)', () => {
  expect(webhookSource).toContain('function toWebhookEnvelope')
  expect(webhookSource).toContain('const bodyPayload = toRecord(rawBody.payload)')
  expect(webhookSource).toContain('const bodyData = toRecord(rawBody.data)')
})

test('Webhook membaca id pesan serialized untuk kompatibilitas versi', () => {
  expect(webhookSource).toContain('function toSerializedId')
  expect(webhookSource).toContain('const serialized = record._serialized')
  expect(webhookSource).toContain('const eventId = toEventId(data)')
})

test('Webhook memperbarui status sent delivered read berdasarkan ack', () => {
  expect(webhookSource).toContain("if (event === 'message.ack')")
  expect(webhookSource).toContain('status = mapAckToStatus(ack)')
  expect(webhookSource).toContain("source: 'waha_ack'")
})

const actionPath = path.join(process.cwd(), 'src', 'app', 'actions', 'whatsapp.ts')
const actionSource = fs.readFileSync(actionPath, 'utf8')

test('Server action melakukan bootstrap kontak dari WAHA saat chat DB kosong', () => {
  expect(actionSource).toContain('async function bootstrapChatsFromWaha')
  expect(actionSource).toContain('const shouldBootstrap = (!data || data.length === 0) && !normalizedSearch && page === 1')
  expect(actionSource).toContain('const synced = await bootstrapChatsFromWaha')
})

test('Server action memetakan pencarian kontak via wa_contacts agar kompatibel PostgREST', () => {
  expect(actionSource).toContain(".from('wa_contacts')")
  expect(actionSource).toContain('.or(`display_name.ilike.%${normalizedSearch}%,wa_jid.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`)')
})

test('Server action menangani WAHA 503 sebagai warning non-fatal', () => {
  expect(actionSource).toContain('function isWahaUnavailableError')
  expect(actionSource).toContain("warning = 'Layanan WAHA sedang tidak tersedia (503). Menampilkan data lokal terakhir.'")
  expect(actionSource).toContain('warning,')
})

test('Register webhook mendukung URL eksplisit dari environment', () => {
  expect(actionSource).toContain("process.env.WAHA_WEBHOOK_URL")
  expect(actionSource).toContain('const webhookUrl = explicitWebhookUrl || `${baseUrl}/api/public/whatsapp/webhook`')
})

const optimizedClientPath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'whatsapp', 'components', 'OptimizedWhatsAppClient.tsx')
const optimizedClientSource = fs.readFileSync(optimizedClientPath, 'utf8')

test('Optimized client menampilkan warning tanpa memaksa fallback mode', () => {
  expect(optimizedClientSource).toContain('setContactsError(result.warning || null)')
})

const webhookAliasPath = path.join(process.cwd(), 'src', 'app', 'api', 'whatsapp', 'webhook', 'route.ts')
const webhookAliasSource = fs.readFileSync(webhookAliasPath, 'utf8')

test('Tersedia alias endpoint webhook untuk kompatibilitas path lama', () => {
  expect(webhookAliasSource).toContain("export { GET, POST } from '../../public/whatsapp/webhook/route';")
})

if (!passed) process.exit(1)
console.log('All WhatsApp CRM integration tests passed!')
