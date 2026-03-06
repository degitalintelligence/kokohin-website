export type RecurringPattern = 'daily' | 'weekdays' | 'custom'

export function generateRecurringDates(
  startDate: string,
  weeksAhead: number,
  pattern: RecurringPattern,
  daysOfWeek: number[],
): string[] {
  const res: string[] = []
  if (!startDate) return res
  const start = new Date(startDate)
  const weeks = weeksAhead > 0 && weeksAhead <= 52 ? weeksAhead : 4
  const totalDays = weeks * 7
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const isoDow = d.getDay() === 0 ? 7 : d.getDay()
    if (pattern === 'weekdays' && (isoDow === 6 || isoDow === 7)) continue
    if (pattern === 'custom') {
      if (!daysOfWeek || daysOfWeek.length === 0) continue
      if (!daysOfWeek.includes(isoDow)) continue
    }
    res.push(d.toISOString().slice(0, 10))
  }
  return res
}

