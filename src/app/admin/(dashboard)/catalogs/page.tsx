import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, BadgeDollarSign, BarChart3 } from 'lucide-react'
import styles from '../page.module.css'

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
  if (rows.length === 0) return
  const [header, ...dataRows] = rows
  const index = (key: string) => header.findIndex((h) => h.toLowerCase() === key)
  const payload = dataRows.map((row) => {
    const basePrice = row[index('base_price_per_m2')]
    const isActiveValue = row[index('is_active')]
    return {
      title: row[index('title')],
      image_url: row[index('image_url')] || null,
      atap_id: row[index('atap_id')] || null,
      rangka_id: row[index('rangka_id')] || null,
      base_price_per_m2: basePrice ? Number(basePrice) : 0,
      is_active: isActiveValue ? ['true', '1', 'yes'].includes(String(isActiveValue).toLowerCase()) : true
    }
  })
  const { error } = await supabase.from('catalogs').upsert(payload, { onConflict: 'title' })
  if (error) {
    console.error('Error importing catalogs:', error)
  }
  redirect('/admin/catalogs')
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
  atap_id: string | null
  rangka_id: string | null
  base_price_per_m2: number
  is_active: boolean
}>) => {
  const header = ['title', 'image_url', 'atap_id', 'rangka_id', 'base_price_per_m2', 'is_active']
  const rows = catalogs.map((c) => [
    escapeCsvValue(c.title),
    escapeCsvValue(c.image_url),
    escapeCsvValue(c.atap_id),
    escapeCsvValue(c.rangka_id),
    escapeCsvValue(c.base_price_per_m2),
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

export default async function AdminCatalogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch catalogs with related materials
  const { data: catalogs, error } = await supabase
    .from('catalogs')
    .select(`
      *,
      atap:atap_id(name, category),
      rangka:rangka_id(name, category)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching catalogs:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCatalogType = (catalog: { atap_id: string | null, rangka_id: string | null }) => {
    if (catalog.atap_id && catalog.rangka_id) return 'Paket Lengkap'
    if (catalog.atap_id) return 'Hanya Atap'
    if (catalog.rangka_id) return 'Hanya Rangka'
    return 'Custom'
  }
  const csvContent = buildCatalogsCsv(catalogs ?? [])
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Manajemen Katalog Paket</h1>
            <p className={styles.sub}>Paket kanopi standar yang ditawarkan ke customer</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/catalogs/new" className="btn btn-primary">
              + Buat Paket Baru
            </Link>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{catalogs?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Paket</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>
              {formatCurrency(catalogs?.reduce((sum, c) => sum + (c.base_price_per_m2 || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Nilai per m²</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>
              {catalogs?.filter(c => c.is_active).length ?? 0}
            </div>
            <div className={styles.statLabel}>Paket Aktif</div>
          </div>
        </div>

        {/* Catalogs Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Paket ({catalogs?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <form action={importCatalogs} className="flex items-center gap-2">
                <input type="file" name="file" accept=".csv" className="text-sm" />
                <button type="submit" className="btn btn-outline-dark btn-sm">Import CSV</button>
              </form>
              <a href={csvHref} download="catalogs.csv" className="btn btn-outline-dark btn-sm">Export CSV</a>
              <button className="btn btn-outline-dark btn-sm">Filter</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Paket</th>
                  <th>Jenis</th>
                  <th>Atap</th>
                  <th>Rangka</th>
                  <th>Harga per m²</th>
                  <th>Estimasi 10m²</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {catalogs?.map(catalog => {
                  const estimatedPrice = (catalog.base_price_per_m2 || 0) * 10
                  return (
                    <tr key={catalog.id}>
                      <td className={styles.bold}>{catalog.title}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badge_new}`}>
                          {getCatalogType(catalog)}
                        </span>
                      </td>
                      <td>{catalog.atap?.name || '—'}</td>
                      <td>{catalog.rangka?.name || '—'}</td>
                      <td className={styles.bold}>{formatCurrency(catalog.base_price_per_m2)}</td>
                      <td>{formatCurrency(estimatedPrice)}</td>
                      <td>
                        <span className={`${styles.badge} ${catalog.is_active ? styles.badge_quoted : styles.badge_closed}`}>
                          {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/admin/catalogs/${catalog.id}`} className="btn btn-outline-dark btn-sm">
                            Edit
                          </Link>
                          <button className="btn btn-outline-danger btn-sm">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!catalogs || catalogs.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada paket katalog. <Link href="/admin/catalogs/new">Buat paket pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cara Kerja Paket Katalog</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">1. Paket Standar</h3>
                <p className="text-gray-600 text-sm">
                  Kombinasi material atap + rangka dengan harga per m² yang fixed. 
                  Customer dapat menghitung estimasi langsung di kalkulator.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">2. Escape Hatch</h3>
                <p className="text-gray-600 text-sm">
                  Jika customer memilih &apos;Custom&apos; di kalkulator, sistem akan bypass auto‑calculation 
                  dan menandai proyek sebagai &apos;Need Manual Quote&apos;.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">3. Dynamic Pricing</h3>
                <p className="text-gray-600 text-sm">
                  Harga paket dapat dikalikan dengan zona markup (persentase + flat fee) 
                  berdasarkan lokasi customer.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
