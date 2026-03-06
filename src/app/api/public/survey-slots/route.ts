import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'

type SlotRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
  blackout: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createSupabaseAdminClient(supabaseUrl, serviceKey)
    : await createClient()

  const today = new Date()
  const startDate = start || today.toISOString().slice(0, 10)
  const endDate = end || new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('survey_slots')
    .select('id,date,start_time,end_time,capacity,is_active,blackout')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch survey slots', 500, error.message)
  }

  const rows = (data as SlotRow[] | null) ?? []
  const activeSlots = rows.filter((row) => row.is_active && !row.blackout)

  if (activeSlots.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  const slotIds = activeSlots.map((s) => s.id)

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('survey_bookings')
    .select('slot_id,status')
    .in('slot_id', slotIds)

  if (bookingsError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch survey bookings', 500, bookingsError.message)
  }

  const bookingCounts: Record<string, number> = {}
  ;(bookingsData as { slot_id: string; status: string }[] | null ?? []).forEach((b) => {
    if (b.status === 'cancelled') return
    bookingCounts[b.slot_id] = (bookingCounts[b.slot_id] || 0) + 1
  })

  const payload = activeSlots.map((slot) => {
    const booked = bookingCounts[slot.id] || 0
    const available = Math.max(0, (slot.capacity || 1) - booked)
    return {
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      booked,
      available,
    }
  })

  return NextResponse.json({ slots: payload })
}

