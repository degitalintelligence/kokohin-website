'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Ruler, ShieldCheck, ArrowRight, Phone, CheckCircle,
  Calculator, Layers, PenTool, Lightbulb, Rocket
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { firstRel } from '@/lib/utils'

const HomePricelist = dynamic(() => import('@/components/home/HomePricelist'))

// ⚠️ GANTI dengan nomor WhatsApp Kokohin yang sebenarnya!
// Format: kode negara + nomor (tanpa +), contoh: 628123456789
const FALLBACK_WA = '628000000000'


type HomeCatalog = {
  id: string
  title: string
  image_url: string | null
  atap_id: string | null
  rangka_id: string | null
  base_price_per_m2: number
  category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'
  atap?: { name: string | null } | null
  rangka?: { name: string | null } | null
}

export default function HomePage() {
  const [catalogs, setCatalogs] = useState<HomeCatalog[]>([])
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    jenis: 'kanopi',
    panjang: '',
    lebar_tinggi: '',
    atap_atau_desain: '',
    rangka: '',
    deskripsi: '',
    nama: '',
    whatsapp: ''
  })
  const [isCalculating, setIsCalculating] = useState(false)
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null)
  const [waNumber, setWaNumber] = useState<string>(FALLBACK_WA)

  useEffect(() => {
    // Fetch hero background
    const fetchHeroBg = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'login_background_url')
          .single()
        if (data?.value) setHeroBgUrl(data.value)
      } catch (e) {
        console.error('Failed to fetch hero bg', e)
      }
    }
    fetchHeroBg()
  }, [])

  useEffect(() => {
    const fetchWa = async () => {
      try {
        const res = await fetch('/api/site-settings/wa-number', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json() as { wa_number?: string | null }
          if (json.wa_number) setWaNumber(json.wa_number)
        }
      } catch {
        // ignore
      }
    }
    fetchWa()
  }, [])

  const pricePerM2 = useMemo(() => {
    if (formData.jenis === 'custom') return 0
    const type = formData.jenis === 'pagar' ? 'pagar' : 'kanopi'
    const relevant = catalogs.filter((c) => (c.atap_id ? 'kanopi' : 'pagar') === type)
    const average = relevant.length > 0
      ? relevant.reduce((sum, c) => sum + (c.base_price_per_m2 || 0), 0) / relevant.length
      : 0
    const fallback = type === 'kanopi' ? 850000 : 700000
    return average > 0 ? average : fallback
  }, [catalogs, formData.jenis])
  const totalEstimation = useMemo(() => {
    const area = parseFloat(formData.panjang || '0') * parseFloat(formData.lebar_tinggi || '0')
    return Math.round(area * pricePerM2).toLocaleString('id-ID')
  }, [formData.lebar_tinggi, formData.panjang, pricePerM2])

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('catalogs')
          .select('id, title, image_url, category, atap_id, rangka_id, base_price_per_m2, atap:atap_id(name), rangka:rangka_id(name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (fetchError) return setCatalogs([])

        const items: HomeCatalog[] = (data ?? []).map((item) => {
          const atap = firstRel(item.atap ?? null)
          const rangka = firstRel(item.rangka ?? null)
          return {
            id: item.id,
            title: item.title,
            image_url: item.image_url ?? null,
            category: item.category ?? undefined,
            atap_id: item.atap_id ?? null,
            rangka_id: item.rangka_id ?? null,
            base_price_per_m2: item.base_price_per_m2 ?? 0,
            atap,
            rangka
          }
        })
        setCatalogs(items)
      } catch {
        setCatalogs([])
      }
    }

    fetchCatalogs()
  }, [])

  const atapOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    catalogs.forEach((catalog) => {
      if (catalog.atap_id && catalog.atap?.name && !map.has(catalog.atap_id)) {
        map.set(catalog.atap_id, { id: catalog.atap_id, name: catalog.atap.name })
      }
    })
    return Array.from(map.values())
  }, [catalogs])

  const rangkaOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    catalogs.forEach((catalog) => {
      if (catalog.rangka_id && catalog.rangka?.name && !map.has(catalog.rangka_id)) {
        map.set(catalog.rangka_id, { id: catalog.rangka_id, name: catalog.rangka.name })
      }
    })
    return Array.from(map.values())
  }, [catalogs])

  const pagarOptions = useMemo(() => {
    return catalogs
      .filter((catalog) => !catalog.atap_id)
      .map((catalog) => ({
        id: catalog.id,
        title: catalog.title,
        image_url: catalog.image_url
      }))
  }, [catalogs])

  const getDefaultAtapValue = useMemo(() => {
    return (jenis: string) => (jenis === 'pagar' ? (pagarOptions[0]?.id ?? '') : (atapOptions[0]?.id ?? ''))
  }, [atapOptions, pagarOptions])

  const getDefaultRangkaValue = useMemo(() => {
    return () => rangkaOptions[0]?.id ?? ''
  }, [rangkaOptions])

  useEffect(() => {
    const t = setTimeout(() => {
      setFormData((prev) => {
        if (prev.jenis === 'custom') return prev
        const atapList = prev.jenis === 'pagar' ? pagarOptions : atapOptions
        const validAtap = atapList.some((option) => option.id === prev.atap_atau_desain)
        const validRangka = rangkaOptions.some((option) => option.id === prev.rangka)
        if (validAtap && validRangka) return prev
        return {
          ...prev,
          atap_atau_desain: validAtap ? prev.atap_atau_desain : getDefaultAtapValue(prev.jenis),
          rangka: validRangka ? prev.rangka : getDefaultRangkaValue(),
        }
      })
    }, 0)
    return () => clearTimeout(t)
  }, [atapOptions, pagarOptions, rangkaOptions, getDefaultAtapValue, getDefaultRangkaValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'jenis') {
        next.atap_atau_desain = getDefaultAtapValue(value)
        next.rangka = getDefaultRangkaValue()
      }
      return next
    })
  }

  const handleSelectCatalog = (catalogType: 'kanopi' | 'pagar') => {
    setFormData({
      ...formData,
      jenis: catalogType,
      atap_atau_desain: getDefaultAtapValue(catalogType),
      rangka: getDefaultRangkaValue(),
    })
    setStep(1)
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleNextStep = () => {
    const isCustomValid = formData.jenis === 'custom'
    const isStandardValid = formData.jenis !== 'custom' && formData.panjang && formData.lebar_tinggi
    if (step === 1 && (isStandardValid || isCustomValid)) setStep(2)
    else if (step === 2 && formData.nama && formData.whatsapp) {
      setIsCalculating(true)
      setTimeout(() => { setIsCalculating(false); setStep(3) }, 1500)
    }
  }

  const handleWA = () => {
    const text = formData.jenis === 'custom'
    ? `Halo tim Kokohin, saya ${formData.nama} ingin konsultasi *Desain Custom*.\n\nCatatan saya: ${formData.deskripsi || '-'}\nMohon info jadwal survei.`
    : `Halo tim Kokohin, saya ${formData.nama} mau book jadwal survei untuk estimasi pembuatan *${formData.jenis.toUpperCase()}* standar saya.`
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const isCustomMode = formData.jenis === 'custom'
  const isPagar = formData.jenis === 'pagar'
  const selectedAtap = atapOptions.find((option) => option.id === formData.atap_atau_desain)
  const selectedPagar = pagarOptions.find((option) => option.id === formData.atap_atau_desain)
  const selectedRangka = rangkaOptions.find((option) => option.id === formData.rangka)
  const fallbackImage = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop'
  const previewImageUrl = isPagar
    ? (selectedPagar?.image_url ?? fallbackImage)
    : (catalogs.find((catalog) => catalog.atap_id === formData.atap_atau_desain)?.image_url ?? fallbackImage)
  const previewTitle = isPagar ? (selectedPagar?.title ?? 'Pagar') : (selectedAtap?.name ?? 'Kanopi')
  const previewBadge = isPagar ? 'Desain Pagar' : 'Atap Pilihan'
  const previewRangkaName = selectedRangka?.name ?? 'Rangka'
  // removed local pricelist helpers (moved into HomePricelist)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-primary-dark font-sans">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-primary-dark text-white">
        {/* Background Image */}
        {heroBgUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={heroBgUrl}
              alt="Hero Background"
              fill
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary-dark/0" />
          </div>
        )}

        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 animate-fade-in-up shadow-lg">
            <ShieldCheck size={16} className="text-primary drop-shadow-md" />
            <span className="text-sm font-semibold tracking-wide drop-shadow-md">GARANSI KONSTRUKSI 1 TAHUN</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-5xl mx-auto drop-shadow-2xl">
            Bangun Kanopi & Pagar <br />
            <span className="text-primary drop-shadow-lg">Tanpa Biaya Siluman.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-2xl mx-auto font-medium drop-shadow-lg">Ketelitian struktural, pengerjaan rapi, dan transparan dari awal.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/kalkulator" className="flex items-center justify-center gap-2 text-white font-bold py-4 px-8 rounded-md text-lg bg-primary hover:bg-red-700 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200">
              <Calculator size={20} className="drop-shadow-md" /> <span className="drop-shadow-md">Coba Simulasi</span>
            </Link>
            <Link href="/katalog" className="flex items-center justify-center gap-2 bg-white font-bold py-4 px-8 rounded-md text-lg text-primary-dark hover:bg-gray-100 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200">
              Lihat Pricelist
            </Link>
          </div>
        </div>
      </section>

      {/* CATALOG SECTION (Lazy-loaded) */}
      <Suspense fallback={<div className="text-center py-12 text-gray-600">Memuat paket populer...</div>}>
        <HomePricelist onSelectType={handleSelectCatalog} />
      </Suspense>

      {/* KALKULATOR FUNNEL */}
      <section id="kalkulator" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-white flex-grow">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold mb-4 text-primary-dark">Kalkulator Estimasi Biaya</h2>
            <p className="text-gray-600 font-medium">Hitung perkiraan biaya total konstruksi Anda sebelum melakukan survei lokasi.</p>
          </div>

          <div className="flex items-center justify-center mb-10">
            {[1, 2, 3].map((num, i) => (
              <div key={num} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 transition-colors ${step >= num ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-400'}`}>
                  {num}
                </div>
                {i < 2 && <div className={`w-12 h-1 ${step > num ? 'bg-primary' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-6 md:p-10">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 flex flex-col justify-center">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                    <Ruler className="text-primary" /> Detail Konstruksi
                  </h3>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Jenis Konstruksi</label>
                    <select
                      name="jenis"
                      value={formData.jenis}
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50 font-bold"
                    >
                      <option value="kanopi">Kanopi Rumah (Standar)</option>
                      <option value="pagar">Pagar / Railing (Standar)</option>
                      <option value="custom">Desain Custom / Ide Khusus</option>
                    </select>
                  </div>
                  {!isCustomMode ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-bold mb-2">Panjang (m)</label>
                          <input
                            type="number"
                            name="panjang"
                            value={formData.panjang}
                            onChange={handleInputChange}
                            placeholder="5"
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">{isPagar ? 'Tinggi (m)' : 'Lebar (m)'}</label>
                          <input
                            type="number"
                            name="lebar_tinggi"
                            value={formData.lebar_tinggi}
                            onChange={handleInputChange}
                            placeholder={isPagar ? "1.5" : "4"}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-6 mb-8">
                        <div>
                          <label className="block text-sm font-bold mb-2">{isPagar ? 'Desain Pagar' : 'Pilihan Atap'}</label>
                          <select
                            name="atap_atau_desain"
                            value={formData.atap_atau_desain}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          >
                            {isPagar ? (
                              <>
                                <option value="">Pilih desain pagar</option>
                                {pagarOptions.map((option) => (
                                  <option key={option.id} value={option.id}>{option.title}</option>
                                ))}
                              </>
                            ) : (
                              <>
                                <option value="">Pilih atap</option>
                                {atapOptions.map((option) => (
                                  <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                              </>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">Rangka Utama</label>
                          <select
                            name="rangka"
                            value={formData.rangka}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          >
                            <option value="">Pilih rangka</option>
                            {rangkaOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mb-8 bg-red-50 p-5 rounded-xl border border-red-100">
                      <label className="block text-sm font-bold mb-2 flex gap-2">
                        <PenTool size={16} className="text-primary" /> Deskripsi Custom (Opsional)
                      </label>
                      <textarea
                        name="deskripsi"
                        value={formData.deskripsi}
                        onChange={handleInputChange}
                        placeholder="Desain impian Anda..."
                        className="w-full p-4 border border-red-200 rounded-lg h-32 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleNextStep}
                    disabled={!isCustomMode && (!formData.panjang || !formData.lebar_tinggi)}
                    className="w-full py-4 bg-primary text-white font-bold rounded-lg flex justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCustomMode ? 'Lanjut Konsultasi' : 'Hitung Estimasi'} <ArrowRight size={20} />
                  </button>
                </div>

                {/* VISUALIZER */}
                <div className="lg:col-span-5 hidden md:flex flex-col bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-inner">
                  {isCustomMode ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-white rounded-xl text-center p-6">
                      <PenTool size={28} className="text-gray-400 mb-4" />
                      <h4 className="font-bold text-gray-600">Desain Custom</h4>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase flex justify-between">
                        Preview <span className="text-primary">{isPagar ? 'PAGAR' : 'KANOPI'}</span>
                      </h4>
                      <div className="relative h-48 rounded-xl overflow-hidden mb-4 shadow-md group">
                        <Image
                          src={previewImageUrl}
                          alt={previewTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-4 left-4">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-primary text-white">
                            {previewBadge}
                          </span>
                          <h5 className="text-white font-bold text-lg mt-1">{previewTitle}</h5>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 border border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-lg">
                          <Layers size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800">{previewRangkaName}</h5>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="max-w-md mx-auto text-center">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                  Sedikit Lagi! <Rocket className="text-primary w-6 h-6" />
                </h3>
                <div className="space-y-6 mb-8 text-left mt-8">
                  <div>
                    <label className="block text-sm font-bold mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      name="nama"
                      value={formData.nama}
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="px-6 py-4 bg-gray-100 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                    Kembali
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!formData.nama || !formData.whatsapp || isCalculating}
                    className="flex-1 bg-primary-dark text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCalculating ? 'Loading...' : 'Lihat Hasil'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="max-w-xl mx-auto text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex justify-center items-center mx-auto mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                {isCustomMode ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-6">
                    <h1 className="text-2xl font-extrabold mb-3 flex items-center justify-center gap-2">
                      Ide Anda Unik! <Lightbulb className="text-yellow-500 w-8 h-8" />
                    </h1>
                    <p className="text-sm text-gray-600 mb-6">Tim Engineer kami perlu meninjau material khusus agar kalkulasi harga akurat.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-6">
                    <p className="text-sm font-bold text-gray-500 uppercase mb-2">Total Estimasi Harga</p>
                    <h1 className="text-4xl font-extrabold text-primary">Rp {totalEstimation}*</h1>
                  </div>
                )}
                <div className="bg-yellow-50 p-4 rounded-xl text-left mb-8 flex gap-4 border border-yellow-100">
                  <ShieldCheck className="text-yellow-600" size={24} />
                  <div>
                    <h4 className="font-bold text-yellow-800 text-sm">Harga Transparan</h4>
                    <p className="text-xs text-yellow-700">Harga final akan dikunci setelah tim kami melakukan survei lokasi.</p>
                  </div>
                </div>
                <button
                  onClick={handleWA}
                  className="w-full py-4 bg-[#25D366] text-white font-bold rounded-lg flex justify-center gap-2 text-lg hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"
                >
                  <Phone size={22} /> Book Jadwal Survei via WA
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}
