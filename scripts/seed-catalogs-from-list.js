/* eslint-disable no-console */
// Seed catalogs from business list
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  const out = {}
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    out[key] = val
  }
  return out
}

function parseCsv(text) {
  const rows = []
  let current = []
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

function toTitle(material, variant, thick) {
  return [material, variant, thick].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function unitFrom(satuan) {
  const t = (satuan || '').toLowerCase()
  if (t.includes('meter lari')) return 'm1'
  if (t.includes('meter persegi')) return 'm2'
  return 'm2'
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() }
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

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
  const idx = (key) => header.findIndex((h) => h.toLowerCase() === key.toLowerCase())

  // Preload materials for simple name matching
  const { data: materials } = await supabase
    .from('materials')
    .select('id,name,category')

  const findAtapId = (materialName) => {
    if (!materials) return null
    const t = (materialName || '').toLowerCase()
    const found =
      materials.find(m => m.category === 'atap' && m.name.toLowerCase().includes(t)) ||
      materials.find(m => m.name.toLowerCase().includes(t))
    return found ? found.id : null
  }

  const payload = dataRows.map((row) => {
    const materialUtama = row[idx('Material_Utama')] || ''
    const varian = row[idx('Varian_Tipe')] || ''
    const ketebalan = row[idx('Ketebalan_Umum')] || ''
    const satuan = row[idx('Satuan_Harga')] || ''
    const hi = Number(row[idx('Estimasi_Harga_Atas_Rp')] || '0')

    const title = toTitle(materialUtama, varian, ketebalan)
    const baseUnit = unitFrom(satuan)

    return {
      title,
      image_url: null,
      category: 'kanopi',
      atap_id: findAtapId(materialUtama) || null,
      rangka_id: null,
      base_price_per_m2: hi,
      base_price_unit: baseUnit,
      is_active: true
    }
  })

  // Upsert by title
  const { error } = await supabase.from('catalogs').upsert(payload, { onConflict: 'title' })
  if (error) {
    console.error('Upsert catalogs error:', error)
    process.exit(1)
  }
  console.log(`Seeded/updated ${payload.length} catalog items`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

