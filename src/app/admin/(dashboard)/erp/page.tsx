import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ErpPipelineClient from '@/components/admin/ErpPipelineClient'

export default async function ErpPipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch all stages data in parallel for performance optimization
  const [
    { data: quotations },
    { data: contracts },
    { data: invoices },
    { data: auditLogs },
    { data: siteSettings }
  ] = await Promise.all([
    supabase
      .from('erp_quotations')
      .select('*, leads(*), erp_quotation_items(*), estimations(id, margin_percentage, total_hpp, erp_estimation_items(*)), catalogs(*), zones(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('erp_contracts')
      .select('*, erp_quotations(*, leads(*)), erp_contract_items(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('erp_invoices')
      .select('*, erp_contracts(*, erp_quotations(*, leads(*))), erp_invoice_items(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('erp_audit_trail')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20),
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'logo_url')
      .maybeSingle()
  ])

  const logoUrl = siteSettings?.value || null

  return (
    <ErpPipelineClient 
      initialData={{
        quotations: quotations ?? [],
        contracts: contracts ?? [],
        invoices: invoices ?? [],
        auditLogs: auditLogs ?? []
      }}
      logoUrl={logoUrl}
    />
  )
}
