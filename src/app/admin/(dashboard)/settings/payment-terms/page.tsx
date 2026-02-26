import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentTermsClient from '@/components/admin/PaymentTermsClient'

export default async function PaymentTermsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: paymentTerms } = await supabase
    .from('erp_payment_terms')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      <PaymentTermsClient initialData={paymentTerms ?? []} />
    </div>
  )
}
