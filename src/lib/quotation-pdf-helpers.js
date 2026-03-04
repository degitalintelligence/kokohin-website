export function normalizeQuotationNumber(value, fallbackId) {
  const raw = String(value || '').trim()
  if (raw) return raw
  const fallback = String(fallbackId || '').trim()
  if (!fallback) return 'QTN-UNKNOWN'
  return `QTN-${fallback.slice(0, 8).toUpperCase()}`
}

export function normalizeAddressForSalutation(address) {
  const raw = String(address || '').trim()
  return raw || 'tempat'
}

export function normalizeImageUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  return null
}

export async function verifyImageUrlExists(url) {
  const normalized = normalizeImageUrl(url)
  if (!normalized) return false
  try {
    const response = await fetch(normalized, { method: 'HEAD' })
    if (response.ok) return true
  } catch {
  }
  try {
    const response = await fetch(normalized, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}
