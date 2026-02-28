export function formatZoneName(name?: string | null): string {
  if (!name) return ''
  const cleaned = name.replace(/^zona\s+/i, '').trim()
  return cleaned.length > 0 ? cleaned : name
}

