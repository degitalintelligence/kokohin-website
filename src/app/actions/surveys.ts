'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALLOWED_ADMIN_ROLES, isRoleAllowed } from '@/lib/rbac'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    throw new Error('Forbidden')
  }
  return supabase
}

export async function createSurveySlot(formData: FormData) {
  const supabase = await assertAdmin()

  const date = formData.get('date') as string
  const start = formData.get('start_time') as string
  const end = formData.get('end_time') as string
  const capacityStr = formData.get('capacity') as string
  const blackout = formData.get('blackout') === 'on'
  const isActive = formData.get('is_active') === 'on'

  const capacity = Math.max(1, Number(capacityStr || '1') || 1)

  if (!date || !start || !end) {
    return redirect('/admin/surveys?error=Tanggal%20dan%20jam%20wajib%20diisi')
  }

  const { error } = await supabase.from('survey_slots').insert({
    date,
    start_time: start,
    end_time: end,
    capacity,
    blackout,
    is_active: isActive,
  })

  if (error) {
    console.error('Error creating survey slot:', {
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      code: (error as { code?: string }).code,
    })
    const rawMessage =
      error.message ||
      (error as { details?: string }).details ||
      (error as { hint?: string }).hint ||
      (error as { code?: string }).code ||
      'Unknown error'
    return redirect(
      `/admin/surveys?error=${encodeURIComponent(`Gagal menyimpan slot: ${rawMessage}`)}`
    )
  }

  revalidatePath('/admin/surveys')
  redirect('/admin/surveys')
}

export async function updateSurveySlot(formData: FormData) {
  const supabase = await assertAdmin()

  const id = formData.get('id') as string
  const capacityStr = formData.get('capacity') as string
  const blackout = formData.get('blackout') === 'on'
  const isActive = formData.get('is_active') === 'on'

  if (!id) throw new Error('ID slot tidak valid')

  const capacity = Math.max(1, Number(capacityStr || '1') || 1)

  const { error } = await supabase
    .from('survey_slots')
    .update({
      capacity,
      blackout,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/surveys')
}

export async function deleteSurveySlot(formData: FormData) {
  const supabase = await assertAdmin()
  const id = formData.get('id') as string
  if (!id) throw new Error('ID slot tidak valid')
  const { error } = await supabase.from('survey_slots').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
  revalidatePath('/admin/surveys')
}

export async function updateSurveyBookingStatus(formData: FormData) {
  const supabase = await assertAdmin()
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  if (!id || !status) throw new Error('Data tidak lengkap')

  const allowed = ['pending', 'confirmed', 'cancelled', 'reschedule_requested']
  if (!allowed.includes(status)) {
    throw new Error('Status tidak valid')
  }

  const { error } = await supabase
    .from('survey_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/surveys')
}

export async function rescheduleSurveyBooking(formData: FormData) {
  const supabase = await assertAdmin()
  const id = formData.get('id') as string
  const slotId = formData.get('slot_id') as string

  if (!id || !slotId) throw new Error('Data reschedule tidak lengkap')

  const { data: slot, error: slotError } = await supabase
    .from('survey_slots')
    .select('id,capacity,is_active,blackout')
    .eq('id', slotId)
    .maybeSingle()

  if (slotError || !slot) {
    throw new Error(slotError?.message || 'Slot tidak ditemukan')
  }

  if (!slot.is_active || slot.blackout) {
    throw new Error('Slot tidak tersedia untuk reschedule')
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('survey_bookings')
    .select('id,status')
    .eq('slot_id', slotId)

  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const activeCount =
    (bookings as { id: string; status: string }[] | null ?? []).filter(
      (b) => b.status !== 'cancelled' && b.id !== id
    ).length

  const capacity = slot.capacity || 1
  if (activeCount >= capacity) {
    throw new Error('Slot tujuan sudah penuh')
  }

  const { error } = await supabase
    .from('survey_bookings')
    .update({
      slot_id: slotId,
      status: 'confirmed',
      requested_slot_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/surveys')
}
