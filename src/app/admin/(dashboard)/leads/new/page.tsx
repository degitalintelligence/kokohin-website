import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewLeadForm from './NewLeadForm'

export default async function NewLeadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()

  if (!user && !bypass) {
    redirect('/admin/login')
  }

  // Fetch services for dropdown
  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .order('name')

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <NewLeadForm services={services || []} />
    </div>
  )
}
