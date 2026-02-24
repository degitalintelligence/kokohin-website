export const LOCALE_ID = 'id-ID'
export const TZ_JAKARTA = 'Asia/Jakarta'

type Input = Date | string | number

const toDate = (input: Input) => (input instanceof Date ? new Date(input.getTime()) : new Date(input))

export const formatDateJakarta = (input: Input) => {
  const d = toDate(input)
  return d.toLocaleDateString(LOCALE_ID, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ_JAKARTA,
  })
}

export const formatDateTimeJakarta = (input: Input) => {
  const d = toDate(input)
  return d.toLocaleString(LOCALE_ID, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_JAKARTA,
  })
}

export const toUTCISOString = (input: Input) => {
  const d = toDate(input)
  return d.toISOString()
}

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

const partsYMDJakarta = (input: Input) => {
  const d = toDate(input)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_JAKARTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = Number(parts.find(p => p.type === 'year')?.value || '1970')
  const m = Number(parts.find(p => p.type === 'month')?.value || '01')
  const day = Number(parts.find(p => p.type === 'day')?.value || '01')
  return { y, m, day }
}

export const startOfDayJakarta = (input: Input) => {
  const { y, m, day } = partsYMDJakarta(input)
  const utcMs = Date.UTC(y, m - 1, day) - JAKARTA_OFFSET_MS
  return new Date(utcMs)
}

export const endOfDayJakarta = (input: Input) => {
  const { y, m, day } = partsYMDJakarta(input)
  const utcMs = Date.UTC(y, m - 1, day + 1) - JAKARTA_OFFSET_MS - 1
  return new Date(utcMs)
}

export const nowUTCISOString = () => new Date().toISOString()
