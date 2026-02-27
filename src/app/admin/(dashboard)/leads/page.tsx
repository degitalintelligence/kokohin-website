import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, getStatusLabel, getStatusStyle } from '@/lib/utils/costing'
import {
  Users,
  Search,
  Plus,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Tag
} from 'lucide-react'
import { createQuotationForLead } from '@/app/actions/quotations'
import DownloadLeadPdfButton from '@/components/admin/DownloadLeadPdfButton'

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; view?: string }>
}) {
  const { lead: leadParam, view: viewParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('*, service:service_id(name)')
    .neq('status', 'Deal')
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch logoUrl from site settings
  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'logo_url')
    .maybeSingle()
  const logoUrl = siteSettings?.value || null

  // Fetch full details for active lead if selected
  let activeLead = null
  let activeEstimation = null
  let estimationItems = null
  if (leadParam) {
    const { data: leadData } = await supabase
      .from('leads')
      .select('*, service:service_id(name), catalog:catalog_id(title, base_price_unit), zone:zone_id(name)')
      .eq('id', leadParam)
      .single()
    activeLead = leadData

    if (activeLead) {
      const { data: estData } = await supabase
        .from('estimations')
        .select('*')
        .eq('lead_id', leadParam)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      activeEstimation = estData

      if (activeEstimation) {
        const { data: itemsData } = await supabase
          .from('estimation_items')
          .select('*, material:material_id(*)')
          .eq('estimation_id', activeEstimation.id)
        estimationItems = itemsData
      }
    }
  }

  const manualQuoteCount = leads?.filter((lead) => getStatusLabel(lead.status) === 'Need Manual Quote').length ?? 0
  const totalDealValue = leads?.reduce((acc, lead) => {
    return acc + (Number(lead.total_selling_price) || 0)
  }, 0) ?? 0

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50 relative">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">CRM: Pipeline Leads</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Cari lead..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Leads</p>
              <h3 className="text-2xl font-black text-gray-900">{leads?.length ?? 0}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-4 border-l-4 border-l-[#E30613]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E30613]">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Need Manual Quote</p>
              <h3 className="text-2xl font-black text-gray-900">{manualQuoteCount}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Deal Value</p>
              <h3 className="text-2xl font-black text-gray-900">Rp {formatCurrency(totalDealValue)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tight">Data Prospek Customer</h3>
              <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Lead masuk dari website dan input manual</p>
            </div>
            <Link href="/admin/leads/new" className="flex items-center gap-2 text-xs font-bold text-white bg-[#1D1D1B] px-4 py-2 rounded-lg hover:bg-gray-800 transition-all">
              <Plus size={16} /> Input Manual
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4">ID Lead</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Lokasi</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Harga Estimasi (Awal)</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {leads?.map((lead) => {
                  const displayStatus = getStatusLabel(lead.status)
                  const originalPrice = Number(lead.original_selling_price || lead.total_selling_price || 0)
                  return (
                    <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="p-4 font-mono text-[10px] text-gray-400">#{String(lead.id).slice(0, 8)}</td>
                      <td className="p-4">
                        <Link href={`/admin/leads?lead=${lead.id}&view=detail`} className="block group-hover:translate-x-1 transition-transform">
                          <div className="font-bold text-gray-900 group-hover:text-[#E30613] transition-colors">{lead.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{(lead.service as { name: string } | null)?.name ?? 'Konstruksi'}</div>
                        </Link>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{lead.location || '-'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${getStatusStyle(lead.status)}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link href={`/admin/leads?lead=${lead.id}&view=detail`} className="font-black text-gray-900 hover:text-[#E30613] transition-colors">
                          {originalPrice > 0 ? `Rp ${formatCurrency(originalPrice)}` : <span className="text-gray-300 font-normal italic text-[10px]">No Estimasi (Form Kontak)</span>}
                        </Link>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/admin/leads?lead=${lead.id}&view=detail`}
                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <Eye size={14} /> Detail
                          </Link>
                          <form action={async () => {
                            'use server'
                            let success = false
                            try {
                              const res = await createQuotationForLead(lead.id)
                              success = res.success
                            } catch (e) {
                              console.error('Failed to convert lead:', e)
                            }
                            if (success) redirect('/admin/erp')
                          }}>
                            <button className="inline-flex items-center gap-1.5 text-[10px] font-black text-white bg-[#E30613] px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all shadow-md active:scale-95">
                              <ArrowRight size={14} /> Convert
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!leads || leads.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Belum ada lead yang masuk.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {viewParam === 'detail' && activeLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Detail Inquiry Lead</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">#{String(activeLead.id).slice(0, 8)} | {new Date(activeLead.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <Link href="/admin/leads" className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900">
                <X size={20} />
              </Link>
            </header>

            <div className="flex-1 overflow-auto p-8 space-y-8">
              {/* Contact Section */}
              <section>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Informasi Kontak</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Users size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Nama Lengkap</p>
                      <p className="font-bold text-gray-900">{activeLead.name || <span className="text-gray-300 font-normal italic text-[10px]">Tanpa Nama</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Phone size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">WhatsApp / Telepon</p>
                      <p className="font-bold text-gray-900">{activeLead.phone || <span className="text-gray-300 font-normal italic text-[10px]">Tidak ada nomor</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Mail size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Email</p>
                      <p className="font-bold text-gray-900">{activeLead.email || <span className="text-gray-300 font-normal italic text-[10px]">Tidak diisi</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><MapPin size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Lokasi Proyek</p>
                      <p className="font-bold text-gray-900">{activeLead.location || <span className="text-gray-300 font-normal italic text-[10px]">Tidak ada lokasi</span>}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Inquiry Section */}
              <section className="pt-8 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Detail Kebutuhan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Tag size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Tipe Layanan</p>
                      <p className="font-bold text-gray-900">{(activeLead.service as { name: string } | null)?.name ?? <span className="text-gray-300 font-normal italic text-[10px]">Layanan Umum</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Tag size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Katalog Pilihan</p>
                      <p className="font-bold text-gray-900">{(activeLead.catalog as { title: string } | null)?.title ?? <span className="text-gray-300 font-normal italic text-[10px]">Custom / Manual (Tanpa Katalog)</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Maximize2 size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Dimensi</p>
                      <p className="font-bold text-gray-900">
                        {activeLead.panjang ? `P ${activeLead.panjang}m` : ''} 
                        {activeLead.lebar ? ` × L ${activeLead.lebar}m` : ''}
                        {!activeLead.panjang && !activeLead.lebar && activeLead.unit_qty ? `Qty: ${activeLead.unit_qty} unit` : ''}
                        {!activeLead.panjang && !activeLead.lebar && !activeLead.unit_qty ? <span className="text-gray-300 font-normal italic text-[10px]">Dimensi tidak diinput</span> : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><TrendingUp size={18} /></div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Harga Estimasi Web</p>
                      <p className="font-black text-[#E30613]">
                        {activeLead.original_selling_price || activeLead.total_selling_price 
                          ? `Rp ${formatCurrency(activeLead.original_selling_price || activeLead.total_selling_price)}` 
                          : <span className="text-gray-300 font-normal italic text-[10px]">Tanpa Estimasi (Form Kontak)</span>
                        }
                      </p>
                    </div>
                  </div>
                </div>
                {activeLead.message && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5"><MessageSquare size={12} /> Pesan / Catatan Customer:</p>
                    <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{activeLead.message}&quot;</p>
                  </div>
                )}
              </section>
            </div>

            <footer className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/admin/leads" 
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Tutup
                </Link>
                <DownloadLeadPdfButton 
                  lead={activeLead} 
                  estimation={activeEstimation} 
                  items={estimationItems || []} 
                  logoUrl={logoUrl}
                />
              </div>
              <form action={async () => {
                'use server'
                let success = false
                try {
                  const res = await createQuotationForLead(activeLead.id)
                  success = res.success
                } catch (e) {
                  console.error('Failed to convert lead:', e)
                }
                if (success) redirect('/admin/erp')
              }}>
                <button className="px-8 py-2.5 bg-[#E30613] text-white rounded-xl text-sm font-black hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                  <ArrowRight size={18} /> Convert to Quote
                </button>
              </form>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
