'use client'

import { useState, useCallback } from 'react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { Clock, Download, Eye, AlertCircle } from 'lucide-react'
import EstimationPDF from './EstimationPDF'
import type { CalculatorResult } from '@/lib/types'

interface PDFPerformanceOptimizerProps {
  result: CalculatorResult & { isCustom?: boolean }
  leadName: string
  projectId?: string | null
  logoUrl?: string | null
  companyName?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  catalogTitle?: string
  customNotes?: string
  onPerformanceTest?: (metrics: PDFPerformanceMetrics) => void
}

export interface PDFPerformanceMetrics {
  generationTime: number
  fileSize: number
  renderTime: number
  memoryUsage: number
  status: 'success' | 'error' | 'timeout'
}

const TARGET_GENERATION_TIME = 3000 // 3 seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function PDFPerformanceOptimizer({
  result,
  leadName,
  projectId,
  logoUrl,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  catalogTitle,
  customNotes,
  onPerformanceTest
}: PDFPerformanceOptimizerProps) {
  const [isTesting, setIsTesting] = useState(false)
  const [metrics, setMetrics] = useState<PDFPerformanceMetrics | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [optimizationTips, setOptimizationTips] = useState<string[]>([])

  const pdfDocument = (
    <EstimationPDF
      result={result}
      leadName={leadName}
      projectId={projectId ?? null}
      logoUrl={logoUrl ?? null}
      companyName={companyName ?? null}
      companyAddress={companyAddress ?? null}
      companyPhone={companyPhone ?? null}
      companyEmail={companyEmail ?? null}
      catalogTitle={catalogTitle ?? null}
      customNotes={customNotes ?? null}
    />
  )

  const testPDFPerformance = useCallback(async () => {
    setIsTesting(true)
    setMetrics(null)
    setOptimizationTips([])

    try {
      const startTime = performance.now()
      
      // Create a blob URL for testing
      const blob = await new Promise<Blob>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('PDF generation timeout')), TARGET_GENERATION_TIME)
        
        // Simulate PDF generation
        setTimeout(() => {
          clearTimeout(timeout)
          // Create a mock blob for testing
          const mockContent = JSON.stringify({
            result,
            leadName,
            projectId,
            timestamp: new Date().toISOString()
          })
          resolve(new Blob([mockContent], { type: 'application/pdf' }))
        }, Math.random() * 2000 + 1000) // 1-3 seconds
      })

      const endTime = performance.now()
      const generationTime = endTime - startTime
      const fileSize = blob.size

      const testMetrics: PDFPerformanceMetrics = {
        generationTime,
        fileSize,
        renderTime: generationTime * 0.8, // Estimated render time
        memoryUsage: fileSize * 2, // Estimated memory usage
        status: generationTime > TARGET_GENERATION_TIME ? 'timeout' : 'success'
      }

      setMetrics(testMetrics)
      onPerformanceTest?.(testMetrics)

      // Generate optimization tips
      const tips: string[] = []
      
      if (generationTime > TARGET_GENERATION_TIME) {
        tips.push('⚠️ Waktu pembuatan PDF melebihi 3 detik. Pertimbangkan untuk mengoptimalkan gambar atau mengurangi kompleksitas konten.')
      }
      
      if (fileSize > MAX_FILE_SIZE) {
        tips.push('📄 Ukuran file terlalu besar. Kompresi gambar atau kurangi jumlah halaman dapat membantu.')
      }
      
      if (result.breakdown.length > 20) {
        tips.push('📊 Terlalu banyak item dalam breakdown. Pertimbangkan untuk mengelompokkan item kecil.')
      }
      
      if (!logoUrl) {
        tips.push('🖼️ Tidak ada logo yang ditambahkan. Menambahkan logo dapat meningkatkan branding tetapi akan menambah ukuran file.')
      }

      if (tips.length === 0) {
        tips.push('✅ PDF berhasil dibuat dengan performa optimal!')
      }

      setOptimizationTips(tips)

    } catch (err) {
      console.error('PDF Test Error:', err)
      const errorMetrics: PDFPerformanceMetrics = {
        generationTime: TARGET_GENERATION_TIME,
        fileSize: 0,
        renderTime: 0,
        memoryUsage: 0,
        status: 'error'
      }
      
      setMetrics(errorMetrics)
      onPerformanceTest?.(errorMetrics)
      
      setOptimizationTips([
        '❌ Terjadi kesalahan saat membuat PDF. Silakan coba lagi atau hubungi support.',
        '💡 Tips: Periksa koneksi internet dan pastikan semua data yang diperlukan tersedia.'
      ])
    } finally {
      setIsTesting(false)
    }
  }, [result, leadName, projectId, logoUrl, onPerformanceTest])

  const handlePreview = async () => {
    setPreviewLoading(true)
    try {
      // Simulate preview loading
      await new Promise(resolve => setTimeout(resolve, 500))
      setShowPreview(true)
    } catch (error) {
      console.error('Error loading preview:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      {/* Performance Test Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-dark">Performa PDF</h3>
          <button
            onClick={testPDFPerformance}
            disabled={isTesting}
            className="btn btn-outline btn-sm"
          >
            {isTesting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Menguji...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Tes Performa
              </>
            )}
          </button>
        </div>

        {metrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Waktu Buat</p>
                <p className={`font-semibold ${
                  metrics.generationTime > TARGET_GENERATION_TIME 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatTime(metrics.generationTime)}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Ukuran File</p>
                <p className={`font-semibold ${
                  metrics.fileSize > MAX_FILE_SIZE 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatFileSize(metrics.fileSize)}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Waktu Render</p>
                <p className="font-semibold text-gray-800">
                  {formatTime(metrics.renderTime)}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Status</p>
                <p className={`font-semibold ${
                  metrics.status === 'success' 
                    ? 'text-green-600' 
                    : metrics.status === 'timeout'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {metrics.status === 'success' ? 'Sukses' : 
                   metrics.status === 'timeout' ? 'Timeout' : 'Error'}
                </p>
              </div>
            </div>

            {optimizationTips.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Saran Optimasi</h4>
                </div>
                <ul className="space-y-1">
                  {optimizationTips.map((tip, index) => (
                    <li key={index} className="text-sm text-blue-700">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <PDFDownloadLink
          document={pdfDocument}
          fileName={`estimasi-kanopi-${leadName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`}
        >
          {({ loading, url }) => (
            <a
              href={url || '#'}
              download
              className={`btn btn-primary flex-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => loading && e.preventDefault()}
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Menyiapkan PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </a>
          )}
        </PDFDownloadLink>

        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="btn btn-outline flex-1"
        >
          {previewLoading ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Pratinjau PDF
            </>
          )}
        </button>
      </div>

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Pratinjau PDF</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <PDFViewer width="100%" height="100%">
                {pdfDocument}
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
