export type MaterialRecord = {
  id?: string
  code?: string
  name?: string
  [key: string]: unknown
}

export function buildCopyName(baseName: string) {
  return `Copy of ${baseName}`
}

export function buildCopyCode(baseCode: string, existingCodes: string[]) {
  const base = `${baseCode}-COPY`
  const set = new Set(existingCodes)
  if (!set.has(base)) return base
  let i = 2
  while (set.has(`${base}-${i}`)) {
    i += 1
  }
  return `${base}-${i}`
}
