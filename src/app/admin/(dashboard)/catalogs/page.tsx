import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, BadgeDollarSign, BarChart3 } from 'lucide-react'
import { relNameFrom } from '@/lib/utils'
import styles from '../page.module.css'
import ImportCsvForm from './components/ImportCsvForm'

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
      base_price_unit: (row[index('base_price_unit')] as ('m2'|'m1'|'unit')) || 'm2',
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
  redirect('/admin/catalogs')
}

async function importFenceRailingCatalogPreset() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  const raw = `Kategori,SKU,Nama_Produk_Komersial,Rangka_Utama,Cover_atau_Isian,Target_Market,Estimasi_HPP_m2_Rp,Harga_Jual_Bawah_m2_Rp,Harga_Jual_Atas_m2_Rp,Copywriting_Angle
Kanopi,KNP-01,Kanopi Lite Shield,Baja Ringan C75,Spandek Pasir 0.30mm,Kos-kosan / Kontrakan / Entry Level,200000,280000,350000,Proteksi maksimal budget minimal. Bebas bising hujan tanpa bikin kantong jebol.
Kanopi,KNP-02,Kanopi Urban Minimalist,Hollow Galvanis 4x4,Spandek Pasir 0.30mm,Rumah Subsidi / Cluster Standar,300000,450000,550000,Look besi kokoh anti-karat dengan atap peredam suara. Upgrade pinter buat rumah pertamamu.
Kanopi,KNP-03,Kanopi Chill Breeze (Best Seller),Hollow Galvanis 4x6,Alderon Twinwall 10mm,Cluster Menengah / Renovasi Rumah,550000,750000,950000,Carport adem kayak pakai AC alam. Investasi biar cat mobil awet & nongkrong di teras makin pewe.
Kanopi,KNP-04,Kanopi Sky Clear,Hollow Galvanis 4x6 / 5x10,SolarFlat 1.2mm,Rumah Tropis Modern / Cafe,650000,900000,1200000,Pencahayaan natural tanpa takut bocor. Aesthetic semi-outdoor ala cafe kekinian di teras sendiri.
Kanopi,KNP-05,Kanopi Sultan Glass,Hollow 5x10 / Baja WF,Kaca Tempered 8mm,Rumah Mewah / High-end Commercial,1200000,1800000,2500000,Kemewahan transparan tanpa kompromi. View langit 100% clear dengan struktur kokoh industrial.
Pagar,PGR-01,Pagar Basic Grid,Hollow Hitam 4x4,Besi Nako / Hollow 2x4,Fungsional / Security First,300000,450000,600000,Garis tegas proteksi jelas. Solusi aman yang nggak neko-neko buat jaga rumah lo.
Pagar,PGR-02,Pagar Tropical Wood,Hollow Galvanis 4x6,GRC Woodplank / WPC,Pecinta Nature / Modern Tropis,450000,650000,900000,Vibe villa Bali di depan rumah. Hangatnya tekstur kayu dengan durabilitas baja anti-rayap.
Pagar,PGR-03,Pagar Urban Industrial,Hollow Galvanis 4x6,Expanded Metal / Perforated,Anak Muda / Arsitektur Kontemporer,500000,750000,1000000,Raw maskulin sirkulasi udara plong tapi privasi tetap aman. Pagar idaman Gen Z.
Pagar,PGR-04,Pagar Signature Cut,Hollow Galvanis 5x10,Plat Besi Laser Cut Custom,Rumah Mewah / Desain Eksklusif,800000,1200000,1800000,Satu-satunya di komplek lo. Motif custom sesuai karakter bukan sekadar pagar ini karya seni.
Railing,RLG-01,Railing Core Minimalis,Hollow Galvanis 4x4,Hollow Galvanis 2x4,Rumah 2 Lantai Standar,350000,500000,700000,Aman kokoh desain clean. Bikin area tangga lo nggak kelihatan sempit dan sumpek.
Railing,RLG-02,Railing Warm Grip,Hollow Galvanis 4x4,Handrail Kayu Solid + Jari Besi,Klasik Modern,450000,700000,900000,Sentuhan kayu natural di setiap pegangan. Elegan dan gak dingin pas dipegang pagi hari.
Railing,RLG-03,Railing Infinity Glass,Stainless Steel / Hollow Tebal,Kaca Tempered 8mm,Rumah Mewah / Balkon View,900000,1500000,2200000,Unobstructed view. Nikmati pemandangan balkon lo 100% tanpa kehalang jeruji besi.`
  const rows = parseCsv(raw)
  const [header, ...dataRows] = rows
  const idx = (key: string) => header.findIndex((h) => h.toLowerCase() === key.toLowerCase())
  const catMap = (v: string): 'kanopi'|'pagar'|'railing'|'aksesoris'|'lainnya' => {
    const t = v.toLowerCase()
    if (t.includes('kanopi')) return 'kanopi'
    if (t.includes('pagar')) return 'pagar'
    if (t.includes('railing')) return 'railing'
    return 'lainnya'
  }
  const payload = dataRows.map((row) => {
    const category = catMap(row[idx('Kategori')] || '')
    const title = row[idx('Nama_Produk_Komersial')] || ''
    const baseHigh = Number(row[idx('Harga_Jual_Atas_m2_Rp')] || '0')
    return {
      title,
      image_url: null,
      category,
      atap_id: null,
      rangka_id: null,
      base_price_per_m2: baseHigh,
      base_price_unit: 'm2' as const,
      is_active: true
    }
  })
  const { data: existing } = await supabase.from('catalogs').select('id,title')
  const existingSet = new Set((existing ?? []).map((c: { title: string }) => c.title))
  const toInsert = payload.filter(p => !existingSet.has(p.title))
  const toUpdate = payload.filter(p => existingSet.has(p.title))
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('catalogs').insert(toInsert)
    if (insErr) console.error('Insert fence/railing catalogs error:', insErr)
  }
  for (const p of toUpdate) {
    const { error: updErr } = await supabase.from('catalogs').update(p).eq('title', p.title)
    if (updErr) console.error('Update fence/railing catalog error:', updErr, 'title:', p.title)
  }
  redirect('/admin/catalogs')
}
async function importKokohinPreset() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  const raw = `Kategori_Atap,Material_Utama,Varian_Tipe,Ketebalan_Umum,Satuan_Harga,Estimasi_Harga_Bawah_Rp,Estimasi_Harga_Atas_Rp,Karakteristik_Fisik,Aesthetic_Positioning
Metal / Baja,Spandek Polos,Galvalum / Zincalume,0.25 - 0.50 mm,Meter Lari,45000,75000,Ringan tipis sangat berisik saat hujan panas.,Industrial budget / Proyek fungsional.
Metal / Baja,Spandek Pasir,Berlapis pasir & lem,0.30 - 0.50 mm,Meter Lari,65000,95000,Meredam suara hujan tekstur kasar.,Fungsional dengan UX lebih baik.
Metal / Baja,Spandek Transparan,Plastik / PET,0.8 - 1.2 mm,Meter Lari,90000,130000,Tembus cahaya biasa untuk skylight.,Fungsional (pencahayaan alami).
Metal / Baja,Spandek Lapis Peredam,Lapis Aluminium Foil,0.30 - 0.40 mm,Meter Lari,95000,140000,Ada insulasi panas bawaan di bawah.,Industrial upgrade.
uPVC,Alderon Twinwall,Double Layer (Berongga),10 mm,Meter Lari,180000,240000,Sangat kaku meredam panas & suara maksimal.,Menengah ke atas. Clean modern sejuk.
uPVC,Alderon RS,Single Layer (Tanpa Rongga),1.2 - 1.5 mm,Meter Lari,75000,100000,Lebih ringan tidak sekedap Twinwall.,Alternatif hemat uPVC.
Polycarbonate,Polycarbonate Multi-wall,Twinlite / Solarlite,4 - 6 mm,Meter Lari,250000,350000,Berongga lentur tembus cahaya (harga konversi dari roll).,Modern 2010s look. Rentan jamur di rongga.
Polycarbonate,Polycarbonate Solid Flat,SolarFlat / EZ-Lock,1.2 - 3 mm,Meter Lari,250000,450000,Solid tanpa rongga bening seperti kaca tidak mudah pecah.,Modern kontemporer. Alternatif kaca.
Polycarbonate,Polycarbonate Gelombang,SolarTuff,0.8 mm,Meter Lari,150000,190000,Bening bergelombang kuat UV protection.,Tropical modern / Semi-outdoor vibe.
Kaca,Kaca Tempered,Clear / Dark / Frosted,8 - 12 mm,Meter Persegi,800000,1500000,Keras pecah jadi butiran jagung aman sangat berat.,Sangat premium. Clean luxury minimalis.
Kaca,Kaca Laminated,Dua lapis kaca + PVB,5+5 - 6+6 mm,Meter Persegi,1200000,2500000,Sangat aman kaca tetap menempel di film jika pecah.,Ultra-premium. Biasa untuk skylight gedung.
Plastik / Akrilik,Akrilik (Acrylic),Bening / Susu,2 - 5 mm,Meter Persegi,400000,700000,Lebih ringan dari kaca rawan baret.,Alternatif kaca kurang tahan cuaca jangka panjang.
Membrane,Kain Membran PVC,Agtex / Serge Ferrari,700 - 950 gsm,Meter Persegi,400000,900000,Fleksibel ditarik tahan cuaca ekstrem (Harga material saja).,Ikonik komersial futuristik resort vibe.
Bitumen,Atap Onduline,Gelombang Cellulosa,3 mm,Meter Persegi,90000,110000,Ringan lentur kedap suara tidak berkarat.,Rustic natural atau gaya Eropa klasik.
Bitumen,Genteng Aspal,Flat berlapis pasir,3 mm,Meter Persegi,150000,250000,Butuh alas multiplek sangat kedap suara elegan.,American classic / gaya rumah tropis mewah.
Kain / Kanvas,Awning Sunbrella,Kain Acrylic Tahan Air,Bervariasi,Meter Lari,600000,900000,Bisa dilipat/digulung warna pudar 5-7 tahun.,Boutique cafe klasik gaya Eropa.
Aluminium,Louver / Sunlouvre,Sirip Aluminium,Bervariasi,Meter Persegi,1800000,2500000,Bisa dibuka-tutup manual/motor (Harga biasanya include pasang).,Smart home high-end patio fungsional dinamis.
Renewable Energy,Solar Panel (BIPV),Mono / Poly,Bervariasi,Meter Persegi,1500000,3000000,Berfungsi ganda atap & listrik (Sangat fluktuatif).,Futuristik eco-friendly investasi jangka panjang.
Tradisional,Bambu / Rumbia / Sirap,Material Alam,Bervariasi,Meter Persegi,50000,150000,Rentan cuaca butuh maintenance ekstra.,Tropical resort eco-tourism rustic.`
  const rows = parseCsv(raw)
  const [header, ...dataRows] = rows
  const idx = (key: string) => header.findIndex((h) => h.toLowerCase() === key.toLowerCase())
  const toTitle = (m: string, v: string, t: string) => [m, v, t].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const unitFrom = (u: string): 'm2'|'m1'|'unit' => {
    const s = (u || '').toLowerCase()
    if (s.includes('meter lari')) return 'm1'
    if (s.includes('meter persegi')) return 'm2'
    return 'm2'
  }
  const { data: materials } = await supabase.from('materials').select('id,name,category')
  const findAtapId = (name: string) => {
    const t = (name || '').toLowerCase()
    const found = (materials ?? []).find(m => m.category === 'atap' && m.name.toLowerCase().includes(t))
    return found ? found.id : null
  }
  const payload = dataRows.map((row) => {
    const materialUtama = row[idx('Material_Utama')] || ''
    const varian = row[idx('Varian_Tipe')] || ''
    const ketebalan = row[idx('Ketebalan_Umum')] || ''
    const satuan = row[idx('Satuan_Harga')] || ''
    const hi = Number(row[idx('Estimasi_Harga_Atas_Rp')] || '0')
    return {
      title: toTitle(materialUtama, varian, ketebalan),
      image_url: null,
      category: 'kanopi',
      atap_id: findAtapId(materialUtama),
      rangka_id: null,
      base_price_per_m2: hi,
      base_price_unit: unitFrom(satuan),
      is_active: true
    }
  })
  const { data: existing } = await supabase.from('catalogs').select('id,title')
  const existingSet = new Set((existing ?? []).map((c: { title: string }) => c.title))
  const toInsert = payload.filter(p => !existingSet.has(p.title))
  const toUpdate = payload.filter(p => existingSet.has(p.title))
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('catalogs').insert(toInsert)
    if (insErr) console.error('Insert preset catalogs error:', insErr)
  }
  for (const p of toUpdate) {
    const { error: updErr } = await supabase.from('catalogs').update(p).eq('title', p.title)
    if (updErr) console.error('Update preset catalog error:', updErr, 'title:', p.title)
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
              <ImportCsvForm importCatalogs={importCatalogs} importPreset={importKokohinPreset} importPresetSecondary={importFenceRailingCatalogPreset} />
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
                      <td>{relNameFrom(catalog.atap)}</td>
                      <td>{relNameFrom(catalog.rangka)}</td>
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
