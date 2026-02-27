import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FolderOpen, BadgeDollarSign, BarChart3, Search, CheckCircle, AlertTriangle } from 'lucide-react'
import ImportCsvForm from './components/ImportCsvForm'
import CatalogsListClient from './components/CatalogsListClient'

async function importCatalogs(formData: FormData) {
  'use server'
  const file = formData.get('file')
  if (!(file instanceof File)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return redirect('/admin/catalogs?notice=imported')
  const [header, ...dataRows] = rows
  const index = (key: string) => header.findIndex((h) => h.toLowerCase() === key)
  const payload = dataRows.map((row) => {
    const basePrice = row[index('base_price_per_m2')]
    const isActiveValue = row[index('is_active')]
    return {
      title: row[index('title')],
      image_url: row[index('image_url')] || null,
      category: row[index('category')] || null,
      atap_id: row[index('atap_id')] || null,
      rangka_id: row[index('rangka_id')] || null,
      finishing_id: row[index('finishing_id')] || null,
      isian_id: row[index('isian_id')] || null,
      base_price_per_m2: basePrice ? Number(basePrice) : 0,
      base_price_unit: (row[index('base_price_unit')] as ('m2'|'m1'|'unit')) || 'm2',
      hpp_per_unit: basePrice ? Number(basePrice) : 0,
      is_active: isActiveValue ? ['true', '1', 'yes'].includes(String(isActiveValue).toLowerCase()) : true
    }
  })
  const { data: existing } = await supabase.from('catalogs').select('id,title')
  const existingSet = new Set((existing ?? []).map((c: { title: string }) => c.title))
  const toInsert = payload.filter(p => !existingSet.has(p.title))
  const toUpdate = payload.filter(p => existingSet.has(p.title))
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('catalogs').insert(toInsert)
    if (insErr) console.error('Insert catalogs error:', insErr)
  }
  for (const p of toUpdate) {
    const { error: updErr } = await supabase.from('catalogs').update(p).eq('title', p.title)
    if (updErr) console.error('Update catalog error:', updErr, 'title:', p.title)
  }
  redirect('/admin/catalogs?notice=imported')
}



const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const buildCatalogsCsv = (catalogs: Array<{
  title: string
  image_url: string | null
  category?: string | null
  atap_id: string | null
  rangka_id: string | null
  finishing_id?: string | null
  isian_id?: string | null
  base_price_per_m2: number
  base_price_unit?: 'm2'|'m1'|'unit'
  hpp_per_unit?: number | null
  is_active: boolean
}>) => {
  const header = ['title', 'image_url', 'category', 'atap_id', 'rangka_id', 'finishing_id', 'isian_id', 'base_price_per_m2', 'base_price_unit', 'hpp_per_unit', 'is_active']
  const rows = catalogs.map((c) => [
    escapeCsvValue(c.title),
    escapeCsvValue(c.image_url),
    escapeCsvValue(c.category),
    escapeCsvValue(c.atap_id),
    escapeCsvValue(c.rangka_id),
    escapeCsvValue(c.finishing_id),
    escapeCsvValue(c.isian_id),
    escapeCsvValue(c.base_price_per_m2),
    escapeCsvValue(c.base_price_unit ?? 'm2'),
    escapeCsvValue(c.hpp_per_unit ?? ''),
    escapeCsvValue(c.is_active)
  ])
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      current.push(field.trim())
      field = ''
      continue
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (field.length > 0 || current.length > 0) {
        current.push(field.trim())
        rows.push(current)
        current = []
        field = ''
      }
      continue
    }
    field += char
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim())
    rows.push(current)
  }
  return rows
}

export default async function AdminCatalogsPage({ searchParams }: { searchParams: Promise<{ hmin?: string; hmax?: string; sort?: string; error?: string; notice?: string }> }) {
  const { hmin, hmax, sort, error: errorParam, notice } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  let query = supabase
    .from('catalogs')
    .select('*')
  const minVal = hmin ? Number(hmin) : NaN
  const maxVal = hmax ? Number(hmax) : NaN
  if (!isNaN(minVal)) {
    query = query.gte('hpp_per_unit', Math.max(0, Math.floor(minVal)))
  }
  if (!isNaN(maxVal)) {
    query = query.lte('hpp_per_unit', Math.max(0, Math.floor(maxVal)))
  }
  const s = (sort || '').toLowerCase()
  if (s === 'hpp_asc') {
    query = query.order('hpp_per_unit', { ascending: true, nullsFirst: true })
  } else if (s === 'hpp_desc') {
    query = query.order('hpp_per_unit', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  const { data: catalogs, error } = await query

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <h3 className="font-bold">Error Memuat Katalog</h3>
          <p className="text-sm mt-1">{error.message}</p>
          {error.hint && <p className="text-xs mt-2 text-red-500 italic">Hint: {error.hint}</p>}
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const sumByUnit = { m2: 0, m1: 0, unit: 0 as number }
  ;(catalogs ?? []).forEach((c) => {
    const u = ((c as { base_price_unit?: 'm2'|'m1'|'unit' | null }).base_price_unit ?? 'm2') as 'm2' | 'm1' | 'unit'
    const v = Number((c as { base_price_per_m2?: number | null }).base_price_per_m2 || 0)
    sumByUnit[u] += v
  })

  const mappedCatalogs = (catalogs ?? []).map((c) => {
    const unit = ((c as { base_price_unit?: 'm2'|'m1'|'unit' | null }).base_price_unit ?? 'm2') as 'm2' | 'm1' | 'unit'
    return {
      id: String((c as { id: string }).id),
      title: String((c as { title: string }).title),
      category: ((c as { category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya' | null }).category ?? null),
      atapName: '-',
      rangkaName: '-',
      finishingName: '-',
      isianName: '-',
      base_price_per_m2: Number((c as { base_price_per_m2?: number | null }).base_price_per_m2 || 0),
      base_price_unit: unit,
      hpp_per_unit: (c as { hpp_per_unit?: number | null }).hpp_per_unit ?? null,
      is_active: !!(c as { is_active?: boolean | null }).is_active,
      is_popular: !!(c as { is_popular?: boolean | null }).is_popular,
      created_at: ((c as { created_at?: string | null }).created_at ?? null),
      atap_id: ((c as { atap_id?: string | null }).atap_id ?? null),
      rangka_id: ((c as { rangka_id?: string | null }).rangka_id ?? null),
      finishing_id: null,
      isian_id: null,
    }
  })
  const csvContent = buildCatalogsCsv(catalogs ?? [])
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Manajemen Katalog Paket</h2>
              <p className="text-sm text-gray-500 mt-1">Paket kanopi standar yang ditawarkan ke customer</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Cari ID/Nama..." className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]" />
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                <Image
                  src="https://ui-avatars.com/api/?name=Admin+Katalog&background=1D1D1B&color=fff"
                  alt="Avatar Admin Katalog"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
        {Boolean(errorParam || notice) && (
          <div className="mb-4">
            {errorParam && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span>{decodeURIComponent(errorParam)}</span>
              </div>
            )}
            {!errorParam && notice === 'created' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Katalog berhasil dibuat</span>
              </div>
            )}
            {!errorParam && notice === 'updated' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Katalog berhasil diperbarui</span>
              </div>
            )}
            {!errorParam && notice === 'deleted' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Katalog berhasil dihapus</span>
              </div>
            )}
            {!errorParam && notice === 'imported' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Import CSV selesai</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Total Paket</p>
              <h3 className="text-2xl font-extrabold text-gray-900">{catalogs?.length ?? 0}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-[#E30613]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E30613]">
              <BadgeDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Ringkasan Nilai per Satuan</p>
              <div className="text-lg font-semibold text-gray-900">
                <div>m²: {formatCurrency(sumByUnit.m2)}</div>
                <div>m¹: {formatCurrency(sumByUnit.m1)}</div>
                <div>unit: {formatCurrency(sumByUnit.unit)}</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Paket Aktif</p>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {catalogs?.filter(c => c.is_active).length ?? 0}
              </h3>
            </div>
          </div>
        </div>

        {/* Catalogs Table */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daftar Paket</h2>
              <p className="text-sm text-gray-500 mt-1">Total {catalogs?.length ?? 0} paket ditemukan.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/catalogs/new" className="btn btn-primary btn-sm">
                + Buat Paket Baru
              </Link>
              <a href={csvHref} download="catalogs.csv" className="btn btn-outline-dark btn-sm">
                Export CSV
              </a>
              <ImportCsvForm importCatalogs={importCatalogs} />
            </div>
          </div>
          <div className="p-5">
            <CatalogsListClient catalogs={mappedCatalogs} />
          </div>
        </section>

        {/* Info Panel */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cara Kerja Paket Katalog</h2>
          </div>
          <div className="p-5 text-sm text-gray-600 space-y-4">
            <p>
              <strong>Katalog Paket</strong> adalah template produk yang akan digunakan oleh tim sales untuk membuat penawaran. Setiap paket memiliki harga dasar dan komponen material (atap & rangka) yang sudah ditentukan.
            </p>
            <p>
              Anda dapat <strong>membuat, mengubah, atau menonaktifkan</strong> paket kapan saja. Perubahan akan langsung terlihat di aplikasi kalkulator sales.
            </p>
            <p>
              Gunakan fitur <strong>Import/Export CSV</strong> untuk mengelola data dalam jumlah besar dengan lebih mudah menggunakan spreadsheet editor seperti Microsoft Excel atau Google Sheets.
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
