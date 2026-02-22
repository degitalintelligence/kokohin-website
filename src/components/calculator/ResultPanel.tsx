'use client'

import dynamic from 'next/dynamic'
import { AlertCircle, FileDown } from 'lucide-react'
import { formatNumber, formatRupiah } from '@/lib/calculator'
import type { CalculatorResult } from '@/lib/types'
import QuotationPDF from './QuotationPDF'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
)

type Props = {
  result: CalculatorResult & { isCustom?: boolean; warnings?: string[]; suggestedItems?: { name: string; estimatedCost: number; reason: string }[] }
  leadName: string
  projectId: string | null
  zoneName: string | null
  logoUrl: string | null
  customNotes?: string | null
  onBookSurvey: () => void
}

export default function ResultPanel({
  result,
  leadName,
  projectId,
  zoneName,
  logoUrl,
  customNotes,
  onBookSurvey
}: Props) {
  if (result.isCustom) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-white/10 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-300" />
            <h4 className="text-lg font-bold">Ide Anda Unik!</h4>
          </div>
          <p className="text-white/90">
            Tim Engineer kami perlu menghitung material secara spesifik. Tim sales akan menghubungi Anda untuk memberikan penawaran manual berdasarkan ide custom yang Anda minta.
          </p>
          {customNotes && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-sm font-medium mb-1">Catatan Anda:</p>
              <p className="text-white/80 text-sm">{customNotes}</p>
            </div>
          )}
        </div>
        <button
          onClick={onBookSurvey}
          className="w-full btn bg-white text-primary-dark hover:bg-white/90 font-bold py-4"
        >
          Konsultasi Custom
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(result.warnings && result.warnings.length > 0) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800">Rekomendasi Teknis</h4>
              <ul className="mt-2 space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-700 list-disc list-inside">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {result.suggestedItems && result.suggestedItems.length > 0 && (
        <div className="p-4 bg-white/10 border border-white/20 rounded-lg">
          <h4 className="font-semibold mb-2 text-white">Item Tambahan yang Direkomendasikan</h4>
          <ul className="space-y-2 text-sm">
            {result.suggestedItems.map((item, idx) => (
              <li key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-white/80">{formatRupiah(item.estimatedCost)}</span>
                </div>
                <p className="text-white/80 text-xs leading-snug">{item.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-white/20">
          <span>Luas Area</span>
          <span className="font-bold">{formatNumber(result.luas)} m²</span>
        </div>
        <div className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg">Estimasi Harga</span>
            <span className="text-2xl font-bold">{formatRupiah(result.estimatedPrice)}</span>
          </div>
          <p className="text-white/70 text-sm mt-2">
            *Harga sudah termasuk PPN 11%
          </p>
        </div>
      </div>

      <div className="pt-6 border-t border-white/20">
        <div className="p-4 bg-white/5 rounded-lg">
          <p className="text-white/80 text-sm italic">
            &quot;Estimasi Harga Transparan, Tanpa Biaya Siluman. Angka simulasi di atas adalah perkiraan awal berdasarkan ukuran dan spesifikasi material yang kamu pilih. Harga final yang fixed akan kami kunci ke dalam kontrak kerja setelah tim Kokohin melakukan survei ke lokasimu secara langsung.&quot;
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-6">
        <button
          onClick={onBookSurvey}
          className="w-full btn bg-primary text-white hover:bg-primary/90 font-bold py-4"
        >
          Book Jadwal Survei
        </button>
        <PDFDownloadLink
          document={
            <QuotationPDF
              result={result}
              leadInfo={{ name: leadName, whatsapp: '' }}
              projectId={projectId}
              zoneName={zoneName}
              logoUrl={logoUrl}
              specifications={result.breakdown?.map(item => item.name).join(', ') || 'Paket Pekerjaan Kanopi'}
              projectArea={result.luas}
              projectType={'Pekerjaan Pembuatan Kanopi'}
              areaUnit="m²"
            />
          }
          fileName={`Penawaran_Kokohin_${leadName.replace(/\s+/g, '_')}.pdf`}
          className="w-full btn bg-white/20 text-white hover:bg-white/30 font-bold py-4 flex items-center justify-center gap-2"
        >
          {({ loading }) => (
            <>
              <FileDown className="w-5 h-5" />
              {loading ? 'Menyiapkan PDF...' : 'Download Penawaran PDF'}
            </>
          )}
        </PDFDownloadLink>
        <button
          onClick={() => { window.location.href = '/katalog' }}
          className="w-full btn bg-transparent border border-white/30 text-white hover:bg-white/10 font-bold py-4"
        >
          Lihat Katalog Paket
        </button>
      </div>
    </div>
  )
}
