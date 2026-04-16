import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'
import { createRateLimiter } from '@/lib/rate-limit'

type Payload = {
  slotId?: string
  leadId?: string | null
  name?: string
  phone?: string
  address?: string | null
  zoneId?: string | null
  notes?: string | null
}

export async function POST(request: Request) {
  try {
    const limiter = createRateLimiter({ windowSeconds: 3600, maxRequests: 5, prefix: 'book-survey' })
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const allowed = await limiter.check(ip)
    if (!allowed) {
      return errorResponse('TOO_MANY_REQUESTS', 'Terlalu banyak permintaan dari IP ini, coba lagi nanti', 429)
    }

    const json = await request.json().catch(() => null) as Payload | null
    if (!json) {
      return errorResponse('BAD_REQUEST', 'Invalid request body', 400)
    }

    const { slotId, leadId, name, phone, address, zoneId, notes } = json

    if (!slotId || typeof slotId !== 'string') {
      return errorResponse('BAD_REQUEST', 'Slot tidak valid', 400)
    }
    if (!name || !phone) {
      return errorResponse('BAD_REQUEST', 'Nama dan nomor WhatsApp wajib diisi', 400)
    }

    const normalizedPhone = String(phone).replace(/\s|-/g, '')
    const indoPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
    if (!indoPhoneRegex.test(normalizedPhone)) {
      return errorResponse('BAD_REQUEST', 'Format nomor WhatsApp tidak valid', 400)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = serviceKey
      ? createSupabaseAdminClient(supabaseUrl, serviceKey)
      : await createClient()

    const { data: slot, error: slotError } = await supabase
      .from('survey_slots')
      .select('id,date,start_time,end_time,capacity,is_active,blackout')
      .eq('id', slotId)
      .maybeSingle()

    if (slotError || !slot) {
      return errorResponse('NOT_FOUND', 'Slot tidak ditemukan', 404, slotError?.message)
    }

    if (!slot.is_active || slot.blackout) {
      return errorResponse('BAD_REQUEST', 'Slot tidak tersedia', 400)
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from('survey_bookings')
      .select('id,status')
      .eq('slot_id', slotId)

    if (bookingsError) {
      return errorResponse('INTERNAL_ERROR', 'Gagal membaca booking', 500, bookingsError.message)
    }

    const activeCount = (bookings as { status: string }[] | null ?? []).filter(
      (b) => b.status !== 'cancelled'
    ).length

    const capacity = slot.capacity || 1
    if (activeCount >= capacity) {
      return errorResponse('CONFLICT', 'Slot sudah penuh', 409)
    }

    const { data: booking, error: insertError } = await supabase
      .from('survey_bookings')
      .insert({
        slot_id: slotId,
        lead_id: leadId || null,
        name,
        phone: normalizedPhone,
        address: address || null,
        zone_id: zoneId || null,
        notes: notes || null,
        status: 'pending',
      })
      .select('id,status')
      .maybeSingle()

    if (insertError || !booking) {
      return errorResponse('INTERNAL_ERROR', 'Gagal menyimpan booking', 500, insertError?.message)
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      status: booking.status,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse('INTERNAL_ERROR', 'Gagal memproses permintaan booking', 500, message)
  }
}
