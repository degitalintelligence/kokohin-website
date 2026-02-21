import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../page.module.css'
import ImportCsvForm from './components/ImportCsvForm'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'

type MaterialImportData = {
  id?: string
  code: string
  name: string
  category: string
  unit: string
  base_price_per_unit: number
  length_per_unit: number | null
  is_active: boolean
  is_laser_cut: boolean
  requires_sealant: boolean
}

export async function importMaterials(formData: FormData) {
  'use server'
  const file = formData.get('file')
  if (!(file instanceof File)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  if (user && !bypass) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
      throw new Error('Hanya Super Admin yang boleh mengimport material')
    }
  }
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return
  const [header, ...dataRows] = rows
  const index = (key: string) => header.findIndex((h) => h.toLowerCase() === key)
  
  const payloadWithId: MaterialImportData[] = []
  const payloadWithoutId: MaterialImportData[] = []

  dataRows.forEach((row) => {
    const id = row[index('id')]
    const basePrice = row[index('base_price_per_unit')]
    const lengthPerUnit = row[index('length_per_unit')]
    const isActiveValue = row[index('is_active')]
    const isLaserCutValue = row[index('is_laser_cut')]
    const requiresSealantValue = row[index('requires_sealant')]
    
    const materialData = {
      code: row[index('code')],
      name: row[index('name')],
      category: row[index('category')],
      unit: row[index('unit')],
      base_price_per_unit: basePrice ? Number(basePrice) : 0,
      length_per_unit: lengthPerUnit ? Number(lengthPerUnit) : null,
      is_active: isActiveValue ? ['true', '1', 'yes'].includes(String(isActiveValue).toLowerCase()) : true,
      is_laser_cut: isLaserCutValue ? ['true', '1', 'yes'].includes(String(isLaserCutValue).toLowerCase()) : false,
      requires_sealant: requiresSealantValue ? ['true', '1', 'yes'].includes(String(requiresSealantValue).toLowerCase()) : false
    }

    if (id && id.trim() !== '') {
      payloadWithId.push({ ...materialData, id: id.trim() })
    } else {
      payloadWithoutId.push(materialData)
    }
  })

  // 1. Process updates by ID (allows changing code)
  if (payloadWithId.length > 0) {
    const { error } = await supabase.from('materials').upsert(payloadWithId, { onConflict: 'id' })
    if (error) {
      console.error('Error updating materials by ID:', error)
      throw new Error(`Update failed: ${error.message}`)
    }
  }

  // 2. Process inserts/updates by Code (for new items or legacy CSVs)
  if (payloadWithoutId.length > 0) {
    const { error } = await supabase.from('materials').upsert(payloadWithoutId, { onConflict: 'code' })
    if (error) {
      console.error('Error importing materials by Code:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  redirect('/admin/materials')
}

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const buildMaterialsCsv = (materials: Array<{
  id: string
  code: string
  name: string
  category: string
  unit: string
  base_price_per_unit: number
  length_per_unit: number | null
  is_active: boolean
  is_laser_cut?: boolean
  requires_sealant?: boolean
}>) => {
  const header = ['id', 'code', 'name', 'category', 'unit', 'base_price_per_unit', 'length_per_unit', 'is_active', 'is_laser_cut', 'requires_sealant']
  const rows = materials.map((m) => [
    escapeCsvValue(m.id),
    escapeCsvValue(m.code),
    escapeCsvValue(m.name),
    escapeCsvValue(m.category),
    escapeCsvValue(m.unit),
    escapeCsvValue(m.base_price_per_unit),
    escapeCsvValue(m.length_per_unit),
    escapeCsvValue(m.is_active),
    escapeCsvValue(m.is_laser_cut ?? false),
    escapeCsvValue(m.requires_sealant ?? false)
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

export default async function AdminMaterialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch materials from Supabase
  const { data: materialsRaw, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false })
  const materials = materialsRaw || []

  if (error) {
    console.error('Error fetching materials:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatLengthUnit = (lengthPerUnit: number | null) => {
    if (!lengthPerUnit) return 'Satuan'
    return lengthPerUnit === 1 ? 'Satuan' : `${lengthPerUnit}m`
  }
  const csvContent = buildMaterialsCsv(materials ?? [])
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Manajemen Material</h1>
            <p className={styles.sub}>Daftar material yang digunakan untuk perhitungan harga kanopi</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/materials/new" className="btn btn-primary">
              + Tambah Material
            </Link>
            <ImportCsvForm importMaterials={importMaterials} />
          </div>
        </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statValue}>{materials?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Material</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>
              {formatCurrency(materials?.reduce((sum, m) => sum + (m.base_price_per_unit || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Nilai Material</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📏</div>
            <div className={styles.statValue}>
              {materials?.filter(m => m.length_per_unit && m.length_per_unit > 1).length ?? 0}
            </div>
            <div className={styles.statLabel}>Material Batangan/Lembaran</div>
          </div>
        </div>

        {/* Materials Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Material ({materials?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <a href={csvHref} download="materials.csv" className="btn btn-outline-dark btn-sm">Export CSV</a>
              <button className="btn btn-outline-dark btn-sm">Filter</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Satuan</th>
                  <th>Harga Dasar</th>
                  <th>Panjang per Unit</th>
                  <th>Waste Calculation</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {materials?.map(material => (
                  <tr key={material.id}>
                    <td className={styles.bold}>{material.name}</td>
                    <td>
                      <span className={`${styles.badge} ${material.category === 'atap' ? styles.badge_new : styles.badge_contacted}`}>
                        {material.category}
                      </span>
                    </td>
                    <td>{material.unit}</td>
                    <td className={styles.bold}>{formatCurrency(material.base_price_per_unit)}</td>
                    <td>{formatLengthUnit(material.length_per_unit)}</td>
                    <td>
                      <span className={`${styles.badge} ${material.length_per_unit && material.length_per_unit > 1 ? styles.badge_quoted : styles.badge_closed}`}>
                        {material.length_per_unit && material.length_per_unit > 1 ? 'Math.ceil()' : 'Satuan'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${material.is_active ? styles.badge_quoted : styles.badge_closed}`}>
                        {material.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/admin/materials/${material.id}`} className="btn btn-outline-dark btn-sm">
                          Edit
                        </Link>
                        <button className="btn btn-outline-danger btn-sm">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!materials || materials.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada material. <Link href="/admin/materials/new">Tambah material pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Waste Calculation</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Batangan/Lembaran</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit &gt; 1</code> akan menggunakan <strong>Ceiling Math (Math.ceil())</strong> dalam perhitungan waste.
                  Contoh: Kebutuhan 14m besi, panjang per batang 6m = Math.ceil(14/6) = 3 batang.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Satuan</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit = 1</code> atau <code>null</code> dihitung per satuan tanpa waste.
                  Contoh: Paku, baut, cat, dll.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
