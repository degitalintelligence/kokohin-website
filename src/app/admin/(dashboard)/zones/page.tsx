import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, TrendingUp, BadgeDollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
import styles from '../page.module.css'
import ZoneRow from './components/ZoneRow'

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const buildZonesCsv = (zones: Array<{
  id: string
  name: string
  cities: string[] | null
  markup_percentage: number
  flat_fee: number
  description: string | null
  order_index: number | null
  is_active?: boolean | null
}>) => {
  const header = ['id', 'name', 'cities', 'markup_percentage', 'flat_fee', 'description', 'order_index', 'is_active']
  const rows = zones.map((zone) => [
    escapeCsvValue(zone.id),
    escapeCsvValue(zone.name),
    escapeCsvValue(zone.cities?.join(', ') ?? ''),
    escapeCsvValue(zone.markup_percentage),
    escapeCsvValue(zone.flat_fee),
    escapeCsvValue(zone.description),
    escapeCsvValue(zone.order_index),
    escapeCsvValue(zone.is_active ?? true)
  ])
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

// 

export default async function AdminZonesPage({ searchParams }: { searchParams?: Promise<{ error?: string; notice?: string }> }) {
  const sp = searchParams ? await searchParams : {}
  const errorParam = sp?.error
  const notice = sp?.notice
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch zones from Supabase
  const { data: zones, error } = await supabase
    .from('zones')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching zones:', error.message, error.code, error.details)
    console.error('Full error object:', error)
  }

  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  const csvContent = buildZonesCsv(zones ?? [])
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Manajemen Zona Markup</h1>
            <p className={styles.sub}>Konfigurasi markup harga berdasarkan lokasi customer (Jabodetabek)</p>
          </div>
          <Link href="/admin/zones/new" className="btn btn-primary">
            + Tambah Zona
          </Link>
        </div>

        {(errorParam || notice) && (
          <div className="px-8">
            {errorParam && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span>{decodeURIComponent(errorParam)}</span>
              </div>
            )}
            {!errorParam && notice === 'created' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Zona berhasil dibuat</span>
              </div>
            )}
            {!errorParam && notice === 'updated' && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Zona berhasil diperbarui</span>
              </div>
            )}
          </div>
        )}
        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>
              <MapPin className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{zones?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Zona</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>
              {formatPercentage(zones?.reduce((sum, z) => sum + (z.markup_percentage || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Markup %</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>
              {formatCurrency(zones?.reduce((sum, z) => sum + (z.flat_fee || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Flat Fee</div>
          </div>
        </div>

        {/* Zones Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Daftar Zona ({zones?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <a href={csvHref} download="zones.csv" className="btn btn-outline-dark btn-sm">Export CSV</a>
              <button className="btn btn-outline-dark btn-sm">Reset Urutan</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th className="hidden sm:table-cell">Urutan</th>
                  <th>Nama Zona</th>
                  <th className="hidden md:table-cell">Kota/Kecamatan</th>
                  <th>Markup %</th>
                  <th className="hidden lg:table-cell">Flat Fee</th>
                  <th className="hidden lg:table-cell">Deskripsi</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {zones?.map((zone, index) => (
                  <ZoneRow key={zone.id} zone={zone} index={index} />
                ))}
                {(!zones || zones.length === 0) && (
                  <tr><td colSpan={9} className={styles.empty}>Belum ada zona. <Link href="/admin/zones/new">Tambah zona pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cara Kerja Zona Markup</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Urutan Prioritas</h3>
                <p className="text-gray-600 text-sm">
                  Sistem akan mencocokkan alamat customer dengan zona berdasarkan <strong>order_index</strong>.
                  Zona dengan order_index lebih kecil diprioritaskan.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Contoh: Jakarta Pusat (order_index=1) diprioritaskan daripada Jabodetabek (order_index=5)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Jika tidak cocok, zona default (is_default=true) akan digunakan</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Formula Perhitungan</h3>
                <p className="text-gray-600 text-sm">
                  Harga setelah markup dihitung dengan rumus:
                </p>
                <div className="mt-3 bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <code>
                    final_price = base_price * (1 + markup_percentage/100) + flat_fee
                  </code>
                </div>
                <p className="mt-3 text-gray-600 text-sm">
                  Contoh: Base harga Rp 5.000.000, markup 10%, flat fee Rp 200.000
                  <br />
                  <strong>Final = 5.000.000 × 1.10 + 200.000 = Rp 5.700.000</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
