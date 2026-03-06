import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { formatRupiah, formatNumber } from '@/lib/calculator'
import type { CalculatorResult } from '@/lib/types'

interface EnhancedResultPanelProps {
  result: CalculatorResult & { isCustom?: boolean }
  leadName: string
  projectId: string | null
  onReset: () => void
  onBookSurvey: () => void
  canDownload: boolean
  onDownloadPdf: () => void
  catalogTitle?: string | null
  customNotes?: string | null
}

export default function EnhancedResultPanel({
  result,
  leadName,
  projectId,
  onReset,
  onBookSurvey,
  canDownload,
  onDownloadPdf,
  catalogTitle,
  customNotes,
}: EnhancedResultPanelProps) {
  const [notification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  useEffect(() => {
    // Notification cleanup logic removed if setNotification is not used
  }, [notification])

  const validateEstimation = () => {
    if (!result || result.estimatedPrice === 0) {
      return { valid: false, message: 'Data estimasi tidak tersedia' }
    }
    return { valid: true, message: '' }
  }

  validateEstimation()

  if (result.isCustom) {
    return (
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`
            p-4 rounded-lg border flex items-center gap-3
            ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
            ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
            ${notification.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
          `}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-800 mb-2">Permintaan Custom Terkirim!</h3>
              <p className="text-yellow-700 mb-4">
                Terima kasih atas permintaan Anda. Tim kami akan segera menghubungi Anda untuk konsultasi lanjutan.
              </p>
              {customNotes && (
                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">Catatan Anda:</h4>
                  <p className="text-yellow-700 text-sm">{customNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-bold text-primary-dark mb-4">Estimasi Luas:</h4>
          <div className="bg-primary-light/30 p-4 rounded-lg">
            <p className="text-2xl font-bold text-primary">{formatNumber(result.luas)} m²</p>
            <p className="text-sm text-gray-600">Estimasi luas area kanopi</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-bold text-primary-dark mb-4">Informasi Kontak:</h4>
          <div className="space-y-2">
            <p><span className="font-semibold">Nama:</span> {leadName}</p>
            {projectId && <p><span className="font-semibold">ID Proyek:</span> {projectId}</p>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onBookSurvey}
            className="flex-1 btn btn-primary"
          >
            <Calendar className="w-4 h-4" />
            Book Jadwal Survei
          </button>
          <button
            onClick={onReset}
            className="btn btn-outline"
          >
            <RefreshCw className="w-4 h-4" />
            Hitung Ulang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`
          p-4 rounded-lg border flex items-center gap-3
          ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
          ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
          ${notification.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
        `}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Main Result Card */}
      <div className="card bg-gradient-to-br from-primary-dark to-primary-dark/90 text-white">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Paket yang Dipilih</p>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-1">
              {catalogTitle || 'Paket Kanopi'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/70">Volume</span>
              <p className="text-2xl font-bold">
                {formatNumber(result.luas)}{' '}
                {result.unitUsed === 'm1' ? 'm¹' : result.unitUsed === 'unit' ? 'unit' : 'm²'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/70">Total Estimasi</span>
              <p className="text-2xl font-bold text-primary-light">
                {formatRupiah(result.estimatedPrice)}
              </p>
            </div>
          </div>
        </div>

        {result.warnings && result.warnings.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Peringatan:</h4>
            <ul className="list-disc list-inside text-yellow-700 text-sm">
              {result.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {result.suggestedItems && result.suggestedItems.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Saran Tambahan:</h4>
            <ul className="list-disc list-inside text-blue-700 text-sm">
              {result.suggestedItems.map((item, index) => (
                <li key={index}>
                  {item.name} ({item.reason})
                  {item.estimatedCost > 0 && ` - Estimasi Biaya: ${formatRupiah(item.estimatedCost)}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-primary-light/30 text-primary-dark text-center">
          <p className="text-lg font-bold">Total Estimasi Harga:</p>
          <p className="text-4xl font-extrabold mt-2">{formatRupiah(result.estimatedPrice)}</p>
          <p className="text-sm mt-2">Harga ini adalah estimasi dan dapat berubah sewaktu-waktu.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {canDownload && (
            <button
              className="flex-1 btn btn-primary"
              onClick={onDownloadPdf}
            >
              <Download className="w-4 h-4" />
              Download PDF detail estimasi
            </button>
          )}
          <button
            onClick={onBookSurvey}
            className="flex-1 btn btn-outline"
          >
            <Calendar className="w-4 h-4" />
            Book Jadwal Survei
          </button>
          <button
            onClick={onReset}
            className="flex-1 btn btn-outline"
          >
            <RefreshCw className="w-4 h-4" />
            Hitung Ulang
          </button>
        </div>
      </div>
    </div>
  )
}
