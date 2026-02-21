'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitLead } from '@/app/actions/leads'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Service = {
  id: string
  name: string
}

export default function NewLeadForm({ services }: { services: Service[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(submitLead, {
    success: false,
    message: '',
    error: '',
  })

  useEffect(() => {
    if (state.success) {
      router.push('/admin/leads')
      router.refresh()
    }
  }, [state.success, router])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/leads" 
          className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Input Manual Lead</h1>
          <p className="text-sm text-gray-500 mt-1">Masukkan data prospek baru secara manual.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Form Data Lead</h2>
        </div>
        
        <form action={action} className="p-6 space-y-6">
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Gagal Menyimpan</p>
                <p className="text-sm">{state.error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-bold text-gray-700">
                Nama Customer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                placeholder="Contoh: Bpk. Budi Santoso"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-bold text-gray-700">
                Nomor WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                placeholder="Contoh: 081234567890"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-gray-700">
                Email (Opsional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                placeholder="Contoh: budi@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-bold text-gray-700">
                Lokasi / Kota <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                placeholder="Contoh: Jakarta Selatan"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="service" className="block text-sm font-bold text-gray-700">
                Jenis Layanan / Produk
              </label>
              <select
                id="service"
                name="service"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent bg-white"
              >
                <option value="">Pilih Layanan...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="message" className="block text-sm font-bold text-gray-700">
                Catatan Tambahan / Pesan
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
                placeholder="Tulis detail kebutuhan customer di sini..."
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 mt-6">
            <Link
              href="/admin/leads"
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-lg bg-[#E30613] text-white font-bold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Simpan Lead
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
