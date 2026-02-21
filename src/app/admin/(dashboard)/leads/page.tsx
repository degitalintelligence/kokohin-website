import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Calculator,
  Search,
  Plus,
  ArrowLeft,
  Download,
  AlertCircle,
  TrendingUp,
  PenTool,
  HardHat,
  FileEdit,
} from 'lucide-react'
import type { Material } from '@/lib/types'
import GeneratePdfButton from '@/components/admin/GeneratePdfButton'

type ZoneLookup = {
  id: string
  name: string
  cities?: string[] | null
  markup_percentage: number
  flat_fee: number
  order_index?: number | null
  is_default?: boolean | null
  is_active?: boolean | null
}

type ProjectWithEstimations = {
  id: string
  status?: string | null
  lead_id?: string | number | null
  estimations?: {
    total_selling_price?: number | null
    created_at?: string | null
    version_number?: number | null
  }[]
}

const formatCurrency = (value: number) => value.toLocaleString('id-ID')

const getStatusLabel = (status?: string | null) => {
  const normalized = (status ?? '').toString().toLowerCase()
  if (normalized.includes('manual')) return 'Need Manual Quote'
  if (normalized.includes('quote')) return 'Quoted'
  if (normalized.includes('survey')) return 'Surveyed'
  if (normalized === 'new') return 'New'
  if (normalized === 'contacted') return 'Contacted'
  if (normalized === 'closed') return 'Closed'
  return status ?? 'New'
}

const getStatusStyle = (status?: string | null) => {
  const label = getStatusLabel(status)
  if (label === 'Need Manual Quote') return 'bg-red-50 text-[#E30613] border-red-200'
  if (label === 'Quoted') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (label === 'Surveyed') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

const buildCostingItems = (materials: Material[], isCustom: boolean) => {
  const baseQuantities = isCustom ? [3, 20, 5] : [14]
  const selectedMaterials = isCustom ? materials.slice(0, 3) : materials.slice(0, 1)

  return selectedMaterials.map((mat, index) => {
    const qtyNeeded = baseQuantities[index] ?? baseQuantities[0] ?? 1
    const lengthPerUnit = mat.length_per_unit ?? 1
    const qtyCharged = lengthPerUnit <= 1 ? qtyNeeded : Math.ceil(qtyNeeded / lengthPerUnit)
    return {
      id: `${mat.id}-${qtyNeeded}`,
      name: mat.name,
      unit: mat.unit,
      hpp: mat.base_price_per_unit,
      lengthPerUnit,
      qtyNeeded,
      qtyCharged,
      subtotal: qtyCharged * mat.base_price_per_unit,
    }
  })
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; lead?: string }>
}) {
  const { view: viewParam, lead: leadParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('*, service:service_id(name)')
    .order('created_at', { ascending: false })
  const { data: projects } = await supabase
    .from('erp_projects')
    .select('id, status, lead_id, estimations(total_selling_price, created_at, version_number)')
    .order('created_at', { ascending: false })
    .order('version_number', { ascending: false, foreignTable: 'estimations' })
  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .order('name', { ascending: true })

  const view = viewParam === 'costing_builder' ? 'costing_builder' : 'dashboard'
  const activeLead = leads?.find((lead) => String(lead.id) === String(leadParam)) ?? leads?.[0] ?? null
  const statusLabel = getStatusLabel(activeLead?.status)
  const isCustom = statusLabel === 'Need Manual Quote'
  const costingItems = buildCostingItems(materials ?? [], isCustom)
  const totalHpp = costingItems.reduce((acc, item) => acc + item.subtotal, 0)
  const marginSetting = 30
  const normalizedLocation = (activeLead?.location ?? '').toLowerCase()
  const activeZones = (zones ?? []).filter((zone) => zone.is_active ?? true) as ZoneLookup[]
  const sortedZones = [...activeZones].sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999))
  const matchedZone = sortedZones.find((zone) => {
    if (!zone.cities || zone.cities.length === 0) return false
    return zone.cities.some((city) => normalizedLocation.includes(city.toLowerCase()))
  }) ?? sortedZones.find((zone) => zone.is_default) ?? sortedZones[0]
  const markupPercentage = matchedZone?.markup_percentage ?? 0
  const flatFee = matchedZone?.flat_fee ?? 0
  const marginNominal = totalHpp * (marginSetting / 100)
  const priceBeforeMarkup = totalHpp + marginNominal
  const markupNominal = priceBeforeMarkup * (markupPercentage / 100) + flatFee
  const totalSellingPrice = priceBeforeMarkup + markupNominal
  const manualQuoteCount = leads?.filter((lead) => getStatusLabel(lead.status) === 'Need Manual Quote').length ?? 0
  const totalDealValue = (projects ?? [])
    .filter((project) => project.status === 'Deal')
    .reduce((sum, project) => {
      const latestEstimation = project.estimations?.[0]
      return sum + (latestEstimation?.total_selling_price ?? 0)
    }, 0)
  const projectsByLeadId: Record<string, ProjectWithEstimations> = Object.fromEntries(
    ((projects ?? []) as ProjectWithEstimations[])
      .filter((project) => project.lead_id !== null && project.lead_id !== undefined)
      .map((project) => [String(project.lead_id), project])
  )
  const activeProject = activeLead ? projectsByLeadId[String(activeLead.id)] ?? null : null
  const activeEstimationVersion = activeProject?.estimations?.[0]?.version_number ?? 1

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {view === 'dashboard' ? 'Pipeline Leads & Proyek' : `Costing Builder: ${activeLead?.name ?? 'Lead'}`}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Cari ID/Nama..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]" />
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
              <Image
                src="https://ui-avatars.com/api/?name=Admin+Proyek&background=1D1D1B&color=fff"
                alt="User"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {view === 'dashboard' && (
            <div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500">Total Leads (Bulan Ini)</p>
                    <h3 className="text-2xl font-extrabold text-gray-900">{leads?.length ?? 0}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-4 border-l-4 border-l-[#E30613]">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E30613]">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500">Need Manual Quote</p>
                    <h3 className="text-2xl font-extrabold text-gray-900">
                      {manualQuoteCount} <span className="text-xs font-semibold text-[#E30613] bg-red-50 px-2 py-1 rounded ml-2">Action Required</span>
                    </h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500">Total Deal Value</p>
                    <h3 className="text-2xl font-extrabold text-gray-900">Rp {formatCurrency(totalDealValue)}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Data Prospek Masuk</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Badge merah = butuh manual quote, badge kuning = lead punya revisi estimasi &gt; V1
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-gray-500">Filter:</span>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-gray-300 text-[11px] font-medium text-gray-600 bg-white hover:bg-gray-50"
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-red-200 text-[11px] font-semibold text-[#E30613] bg-red-50 hover:bg-red-100"
                      >
                        Need Manual Quote
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-full border border-yellow-200 text-[11px] font-semibold text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
                      >
                        Revisi Estimasi
                      </button>
                    </div>
                    <Link href="/admin/leads/new" className="flex items-center gap-2 text-sm font-bold text-white bg-[#1D1D1B] px-4 py-2 rounded-lg hover:bg-gray-800">
                      <Plus size={16} /> Input Manual Lead
                    </Link>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-sm">
                        <th className="p-4 font-bold text-gray-500 uppercase">ID Lead</th>
                        <th className="p-4 font-bold text-gray-500 uppercase">Nama Customer</th>
                        <th className="p-4 font-bold text-gray-500 uppercase">Tipe Konstruksi</th>
                        <th className="p-4 font-bold text-gray-500 uppercase">Zona Lokasi</th>
                        <th className="p-4 font-bold text-gray-500 uppercase">Status</th>
                        <th className="p-4 font-bold text-gray-500 uppercase">Estimasi</th>
                        <th className="p-4 font-bold text-gray-500 uppercase text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {leads?.map((lead) => {
                        const displayStatus = getStatusLabel(lead.status)
                        const projectForLead = projectsByLeadId[String(lead.id)]
                        const latestVersion = projectForLead?.estimations?.[0]?.version_number ?? 1
                        const hasMultipleVersions = (projectForLead?.estimations?.length ?? 0) > 1
                        const hasAnyEstimation = (projectForLead?.estimations?.length ?? 0) > 0
                        return (
                          <tr
                            key={lead.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              hasMultipleVersions ? 'bg-yellow-50/40' : ''
                            }`}
                          >
                            <td className="p-4 font-semibold text-gray-800">{String(lead.id).slice(0, 8)}</td>
                            <td className="p-4 font-bold text-gray-900">
                              {lead.name}
                              {displayStatus === 'Need Manual Quote' && (
                                <span className="block text-xs font-medium text-gray-500 mt-1 flex items-center gap-1"><PenTool size={12} /> Desain Khusus</span>
                              )}
                            </td>
                            <td className="p-4 text-gray-700">{(lead.service as { name: string } | null)?.name ?? 'Kanopi Standar'}</td>
                            <td className="p-4 text-gray-700">{lead.location ?? 'Jabodetabek'}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(lead.status)}`}>
                                {displayStatus === 'Need Manual Quote' && <AlertCircle size={12} className="mr-1" />}
                                {displayStatus}
                              </span>
                            </td>
                            <td className="p-4">
                              {hasAnyEstimation ? (
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${
                                    hasMultipleVersions
                                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-300'
                                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                                  }`}
                                >
                                  Estimasi V{latestVersion}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                                  Belum ada estimasi
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {displayStatus === 'Need Manual Quote' ? (
                                <Link href={`/admin/leads?view=costing_builder&lead=${lead.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#E30613] px-3 py-1.5 rounded hover:bg-red-700 transition-colors shadow-sm">
                                  <Calculator size={14} /> Buat Estimasi
                                </Link>
                              ) : (
                                <Link href={`/admin/leads?view=costing_builder&lead=${lead.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors">
                                  <FileEdit size={14} /> Edit Estimasi V{latestVersion}
                                  {hasMultipleVersions && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-300">
                                      Revisi
                                    </span>
                                  )}
                                </Link>
                              )}
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
          )}

          {view === 'costing_builder' && (
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <Link href="/admin/leads" className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
                  <ArrowLeft size={20} />
                </Link>
                <div className="flex-1 flex items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                      Costing Builder <span className="text-gray-400 font-medium">| Estimasi V{activeEstimationVersion}</span>
                    </h2>
                    <p className="text-sm font-semibold text-[#E30613] flex items-center gap-2 mt-1">
                      <PenTool size={14} /> Request: {statusLabel} - {activeLead?.name ?? 'Lead'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusLabel === 'Need Manual Quote' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-[#E30613] border border-red-200">
                        <AlertCircle size={12} className="mr-1" />
                        Manual Quote (Desain Custom)
                      </span>
                    )}
                    {activeEstimationVersion > 1 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-800 border border-yellow-300">
                        Revisi Estimasi V{activeEstimationVersion}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><HardHat size={18} className="text-gray-500" /> Rincian Modal (HPP Material & Jasa)</h3>
                      <div className="flex gap-2">
                        <select className="text-sm border border-gray-300 rounded-md px-3 py-1.5 font-medium outline-none focus:ring-1 focus:ring-[#E30613]" defaultValue="">
                          <option value="" disabled>+ Tambah Material</option>
                          {(materials ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                            <th className="p-4 font-bold">Item Material/Jasa</th>
                            <th className="p-4 font-bold w-24">Harga Modal (Rp)</th>
                            <th className="p-4 font-bold bg-yellow-50 text-yellow-800 w-28 border-l border-yellow-200">Kebutuhan Riil</th>
                            <th className="p-4 font-bold bg-red-50 text-[#E30613] w-28 border-l border-red-200">Qty Dibebankan</th>
                            <th className="p-4 font-bold text-right w-32">Subtotal Modal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costingItems.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-4">
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Satuan: {item.unit}</p>
                              </td>
                              <td className="p-4 font-medium text-gray-700">{formatCurrency(item.hpp)}</td>
                              <td className="p-4 bg-yellow-50/30 border-l border-yellow-100">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={item.qtyNeeded}
                                    readOnly
                                    className="w-16 p-1.5 border border-yellow-300 rounded text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-yellow-500 bg-white"
                                  />
                                  <span className="text-xs text-gray-500">{item.lengthPerUnit > 1 ? 'm' : 'x'}</span>
                                </div>
                              </td>
                              <td className="p-4 bg-red-50/30 border-l border-red-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-lg text-[#1D1D1B]">{item.qtyCharged}</span>
                                  {item.lengthPerUnit > 1 && (
                                    <span className="text-[10px] font-bold text-gray-400 leading-tight">Batang<br />Utuh</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-bold text-gray-900 text-right">
                                Rp {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                          <tr>
                            <td colSpan={4} className="p-4 text-right font-bold text-gray-600 uppercase text-xs">Total Modal (HPP):</td>
                            <td className="p-4 text-right font-extrabold text-lg text-gray-900">Rp {formatCurrency(totalHpp)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#1D1D1B] text-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Summary Estimasi</h4>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-medium">Total Modal (HPP)</span>
                          <span className="font-bold">Rp {formatCurrency(totalHpp)}</span>
                        </div>
                      </div>
                      {activeProject && (
                        <Link
                          href={`/admin/projects/${activeProject.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/15 text-white/90 hover:bg-white/10 hover:border-white/25 transition-colors"
                        >
                          <FileEdit size={12} className="mr-1.5" />
                          Detail Proyek & Riwayat
                        </Link>
                      )}
                    </div>
                    <div className="p-6 space-y-6 border-b border-gray-800">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-bold text-gray-300">Set Margin Profit (%)</label>
                          <span className="font-extrabold text-lg text-[#E30613]">{marginSetting}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          step="5"
                          defaultValue={marginSetting}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#E30613]"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-bold">
                          <span>10% (Promo)</span>
                          <span>30% (Standar)</span>
                          <span>60% (High Margin)</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-3">
                          <span className="text-gray-400">Nominal Margin</span>
                          <span className="font-bold text-green-400">+ Rp {formatCurrency(marginNominal)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-gray-400 font-medium block">Markup Lokasi</span>
                          <span className="text-[10px] text-gray-500">Berdasarkan zonasi: {activeLead?.location ?? 'Jabodetabek'}</span>
                        </div>
                        <span className="font-bold text-yellow-400">+ Rp {formatCurrency(markupNominal)}</span>
                      </div>
                      <div className="mt-4 space-y-1 text-xs text-gray-400 border-t border-gray-800 pt-3">
                        <div className="flex justify-between">
                          <span>HPP Material & Jasa</span>
                          <span className="font-semibold text-white">Rp {formatCurrency(totalHpp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margin {marginSetting}%</span>
                          <span className="font-semibold text-green-400">+ Rp {formatCurrency(marginNominal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Markup Lokasi</span>
                          <span className="font-semibold text-yellow-400">+ Rp {formatCurrency(markupNominal)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#E30613] p-6 text-center">
                      <p className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Harga Jual Final</p>
                      <h1 className="text-4xl font-extrabold text-white mb-2">
                        Rp {formatCurrency(totalSellingPrice)}
                      </h1>
                      <p className="text-xs text-white/90 font-medium">Nominal ini yang akan muncul di PDF Quotation customer.</p>
                    </div>
                    <div className="p-4 bg-gray-900">
                      {activeProject ? (
                        <GeneratePdfButton
                          projectId={activeProject.id}
                          disabled={false}
                          className="w-full"
                        />
                      ) : (
                        <button
                          disabled
                          className="w-full py-4 bg-gray-400 text-white font-bold rounded-lg flex justify-center items-center gap-2 cursor-not-allowed"
                        >
                          <Download size={18} /> Tidak ada data proyek untuk PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
