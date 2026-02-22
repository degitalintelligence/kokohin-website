import { generateWhatsAppLink } from '@/utils/generateWhatsAppLink'
import assert from 'assert'

function extractQuery(url: string) {
  const u = new URL(url)
  return u.searchParams.get('text') ?? ''
}

{
  const url = generateWhatsAppLink('survey', {
    adminPhone: '+62 812-3456-7890',
    customerName: 'Dedi',
    area: '15',
    price: 'Rp 12.000.000',
    projectId: 'abc-123'
  })
  assert.ok(url.startsWith('https://wa.me/6281234567890'))
  const text = extractQuery(url)
  assert.ok(text.includes('Dedi'))
  assert.ok(text.includes('Luas Area: 15 m'))
  assert.ok(text.includes('Estimasi Harga: Rp 12.000.000'))
  assert.ok(text.includes('ID Lead: abc-123'))
}

{
  const url = generateWhatsAppLink('consultation', {
    adminPhone: '628111222333',
    customerName: 'Andi',
    customNotes: 'Butuh kanopi warna hitam doff',
    projectId: null
  })
  const text = extractQuery(url)
  assert.ok(url.startsWith('https://wa.me/628111222333'))
  assert.ok(text.includes('Andi'))
  assert.ok(text.includes('Butuh kanopi warna hitam doff'))
}

