import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function removeMembraneService() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) {
    redirect('/admin/login')
  }
  // Delete services with slug/name referencing membrane
  await supabase.from('services').delete().eq('slug', 'membrane')
  await supabase.from('services').delete().ilike('name', '%membran%')

  // Revalidate public pages that depend on services
  revalidatePath('/layanan')
  revalidatePath('/kontak')
  revalidatePath('/galeri')
  revalidatePath('/admin/leads/new')

  redirect('/admin/settings?done=membrane_removed')
}
