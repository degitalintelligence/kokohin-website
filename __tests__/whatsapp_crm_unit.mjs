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

console.log('Running WhatsApp CRM unit tests...')

const wahaPath = path.join(process.cwd(), 'src', 'lib', 'waha.ts')
const wahaSource = fs.readFileSync(wahaPath, 'utf8')

test('WAHA client memiliki fallback endpoint untuk chat list', () => {
  expect(wahaSource).toContain('/api/chats?session=${this.sessionId}')
  expect(wahaSource).toContain('/api/sessions/${this.sessionId}/chats')
})

test('WAHA client memiliki fallback endpoint untuk message list', () => {
  expect(wahaSource).toContain('/api/${this.sessionId}/messages?chatId=${encodedChatId}&limit=${limit}')
  expect(wahaSource).toContain('/api/chats/${encodedChatId}/messages?session=${this.sessionId}&limit=${limit}')
})

test('WAHA client memiliki fallback endpoint kirim pesan', () => {
  expect(wahaSource).toContain('/api/messages/send-text')
  expect(wahaSource).toContain('/api/messages/text')
})

const chatWindowPath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'whatsapp', 'components', 'ChatWindow.tsx')
const chatWindowSource = fs.readFileSync(chatWindowPath, 'utf8')

test('ChatWindow mengirim teks langsung tanpa stripping unicode emoji', () => {
  expect(chatWindowSource).toContain('sendMessageAction(contact.wa_id, newMessage.trim())')
})

test('ChatWindow mendukung media gambar dokumen dan voice note', () => {
  expect(chatWindowSource).toContain('image/jpeg')
  expect(chatWindowSource).toContain('image/png')
  expect(chatWindowSource).toContain('application/pdf')
  expect(chatWindowSource).toContain('application/msword')
  expect(chatWindowSource).toContain('application/vnd.ms-excel')
  expect(chatWindowSource).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  expect(chatWindowSource).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  expect(chatWindowSource).toContain('audio/ogg')
})

if (!passed) process.exit(1)
console.log('All WhatsApp CRM unit tests passed!')
