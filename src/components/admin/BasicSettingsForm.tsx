'use client'

import { useState } from 'react'
import { updateBasicSettings } from '@/app/actions/settings'
import { Save, Loader2 } from 'lucide-react'

export default function BasicSettingsForm(props: { siteName: string; supportEmail: string; supportPhone: string; contactAddress: string; contactHours: string; companyWebsite: string; instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string; youtubeUrl?: string }) {
  const [siteName, setSiteName] = useState(props.siteName || '')
  const [supportEmail, setSupportEmail] = useState(props.supportEmail || '')
  const [supportPhone, setSupportPhone] = useState(props.supportPhone || '')
  const [contactAddress, setContactAddress] = useState(props.contactAddress || '')
  const [contactHours, setContactHours] = useState(props.contactHours || '')
  const [companyWebsite, setCompanyWebsite] = useState(props.companyWebsite || '')
  const [instagramUrl, setInstagramUrl] = useState(props.instagramUrl || '')
  const [facebookUrl, setFacebookUrl] = useState(props.facebookUrl || '')
  const [tiktokUrl, setTiktokUrl] = useState(props.tiktokUrl || '')
  const [youtubeUrl, setYoutubeUrl] = useState(props.youtubeUrl || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const res = await updateBasicSettings({ siteName, supportEmail, supportPhone, contactAddress, contactHours, companyWebsite, instagramUrl, facebookUrl, tiktokUrl, youtubeUrl })
    if ('error' in res && res.error) setMessage({ type: 'error', text: res.error })
    else setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' })
    setLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
      <h3 className="text-lg font-bold mb-2">Informasi Umum</h3>
      <p className="text-sm text-gray-500 mb-4">Atur nama situs, email dukungan, nomor telepon, alamat, jam operasional, website, dan tautan sosial.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nama Situs</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Kokohin"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Dukungan</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@kokohin.co.id"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label>
            <input
              type="tel"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="62xxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
          <textarea
            value={contactAddress}
            onChange={(e) => setContactAddress(e.target.value)}
            placeholder="Tangerang, Indonesia"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jam Operasional</label>
            <input
              type="text"
              value={contactHours}
              onChange={(e) => setContactHours(e.target.value)}
              placeholder="Senin - Sabtu: 08:00 - 17:00 WIB"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="text"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="www.kokohin.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
          <input
            type="text"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/kokohin"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
            <input
              type="text"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/kokohin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@kokohin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">TikTok URL</label>
          <input
            type="text"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@kokohin"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </form>
    </div>
  )
}
