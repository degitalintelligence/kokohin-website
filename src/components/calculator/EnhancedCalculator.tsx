'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calculator } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import EstimationPDF from './EstimationPDF'
import EnhancedCalculatorInputForm from './EnhancedCalculatorInputForm'
import EnhancedResultPanel from './EnhancedResultPanel'
import ContactFormForPdf from './ContactFormForPdf'
import SurveyBookingModal from './SurveyBookingModal'
import { ProgressIndicator, type ProgressStep } from './ProgressIndicator'
import type { CalculatorInput, CalculatorResult, Catalog, Zone, CatalogAddon, Material, LeadInfo } from '@/lib/types'

interface EnhancedCalculatorProps {
  hideTitle?: boolean
  catalogParam?: string
}

export default function EnhancedCalculator({ hideTitle = false, catalogParam }: EnhancedCalculatorProps) {
  const searchParams = useSearchParams()
  const cameFromCatalog = !!catalogParam
  const [currentStep, setCurrentStep] = useState(catalogParam ? 2 : 1)
  const [input, setInput] = useState<CalculatorInput>({
    panjang: 5,
    lebar: 3,
    jenis: 'standard',
    catalogId: catalogParam || undefined,
  })
  const [result, setResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [leadInfo, setLeadInfo] = useState<LeadInfo>({ name: '', whatsapp: '' })
  const [showResults, setShowResults] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<Array<Pick<Catalog, 'id' | 'title' | 'base_price_per_m2' | 'category' | 'atap_id'>>>([])
  const [zones, setZones] = useState<Array<Pick<Zone, 'id' | 'name' | 'markup_percentage' | 'flat_fee'>>>([])
  const [catalogData, setCatalogData] = useState<(Catalog & { base_price_unit?: 'm2' | 'm1' | 'unit' }) | null>(null)
  const [catalogAddons, setCatalogAddons] = useState<(CatalogAddon & { material?: Material })[]>([])
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [dataError, setDataError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<{ url: string; type: 'mockup' | 'reference' }[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyAddress, setCompanyAddress] = useState<string | null>(null)
  const [companyPhone, setCompanyPhone] = useState<string | null>(null)
  const [companyEmail, setCompanyEmail] = useState<string | null>(null)
  const [, setWaNumber] = useState<string>('')
  const [showContactFormForPdf, setShowContactFormForPdf] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)

  const handleCatalogChange = useCallback(
    async (catalogId: string) => {
      setInput((prev) => ({ ...prev, catalogId }))
      setSelectedAddonIds([]) // Reset addons when catalog changes

      try {
        const res = await fetch(`/api/public/catalogs/${catalogId}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error('Failed to fetch catalog details')
        }
        const json = (await res.json()) as {
          catalog: Catalog & { base_price_unit?: 'm2' | 'm1' | 'unit' }
          addons: (CatalogAddon & { material?: Material })[]
        }
        setCatalogData(json.catalog)
        setCatalogAddons(json.addons)
      } catch (error) {
        console.error('Error fetching catalog details:', error)
        setDataError('Gagal memuat detail katalog.')
        setCatalogData(null)
        setCatalogAddons([])
      }
    },
    [setInput, setSelectedAddonIds, setCatalogData, setCatalogAddons, setDataError]
  )

  const handleSaveLeadAndDownloadPdf = async (currentLeadInfo: LeadInfo) => {
    if (!result || !projectId) {
      throw new Error('Data estimasi tidak lengkap untuk menyimpan lead.')
    }

    try {
      // 1. Submit lead data to the new API
      const response = await fetch('/api/public/submit-lead-with-estimation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadInfo: currentLeadInfo,
          result,
          input,
          projectId,
          catalogTitle: catalogData?.title,
          customNotes: input.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal menyimpan data lead.')
      }

      // 2. Programmatically trigger PDF download
      const pdfBlob = await pdf(
        <EstimationPDF
          result={result}
          leadName={currentLeadInfo.name}
          projectId={projectId}
          logoUrl={logoUrl}
          companyName={companyName}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          companyEmail={companyEmail}
          catalogTitle={catalogData?.title}
          customNotes={input.notes ?? undefined}
        />
      ).toBlob()

      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Estimasi_Kanopi_${currentLeadInfo.name || 'Pelanggan'}_${projectId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error: unknown) {
      console.error('Error saving lead or downloading PDF:', error)
      throw new Error((error instanceof Error) ? error.message : 'Terjadi kesalahan saat menyimpan data atau mengunduh PDF.')
    }
  }

  const steps: ProgressStep[] = [
    { id: '1', title: 'Pilih Paket', status: currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'current') : 'pending' },
    { id: '2', title: 'Dimensi & Lokasi', status: currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'current') : 'pending' },
    { id: '3', title: 'Hasil Estimasi', status: currentStep >= 3 ? 'completed' : 'pending' }
  ]

  const handleDownloadPdf = () => {
    setShowContactFormForPdf(true)
    // Optionally, you might want to change the currentStep to a dedicated contact step here
    // For now, we'll just show the form.
  }

  const handleBookSurvey = () => {
    setShowSurveyModal(true)
  }

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate catalog selection saja
      if (!input.catalogId) {
        alert('Silakan pilih paket katalog terlebih dahulu')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Validasi zona dan dimensi
      if (!input.zoneId) {
        alert('Silakan pilih zona lokasi untuk perhitungan mark-up')
        return
      }
      if (input.jenis === 'standard') {
        const panjangValid = typeof input.panjang === 'number' && input.panjang > 0
        const lebarValid = typeof input.lebar === 'number' && input.lebar > 0
        if (!panjangValid || !lebarValid) {
          alert('Silakan lengkapi dimensi panjang dan lebar dengan benar')
          return
        }
      }
      await handleCalculate()
    } else if (currentStep === 3) {
      // This step is now "Hasil Estimasi", so "Lanjutkan" button should not be present
      // or it should trigger a different action (e.g., prompt for contact for PDF)
      // For now, we'll assume it won't be reached in this flow.
    }
  }

  const handlePreviousStep = () => {
    if (currentStep === 4) { // If currently on results, go back to dimensions
      setCurrentStep(2)
    } else if (currentStep === 2 && !cameFromCatalog) { // If on dimensions and not from catalog, go back to package selection
      setCurrentStep(1)
    } else if (currentStep === 2 && cameFromCatalog) { // If on dimensions and from catalog, no previous step
      // Do nothing, or disable "Kembali" button
    }
  }

  const handleCalculate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/public/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (!response.ok) {
        throw new Error('Gagal menghitung estimasi')
      }
      const data = await response.json() as { result: CalculatorResult }
      const calcResult: CalculatorResult & { isCustom?: boolean } = {
        ...data.result,
        isCustom: input.jenis === 'custom',
      }

      setResult(calcResult)
      setProjectId(crypto.randomUUID())
      setCurrentStep(4)
      setShowResults(true)
    } catch (error) {
      console.error('Error calculating:', error)
      alert('Terjadi kesalahan saat menghitung estimasi. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setInput({ panjang: 5, lebar: 3, jenis: 'standard' })
    setResult(null)
    setLeadInfo({ name: '', whatsapp: '' })
    setShowResults(false)
  }

  if (showResults && result) {
    return (
      <div className="max-w-6xl mx-auto p-6 md:p-8" id="enhanced-calculator">
        {!hideTitle && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Calculator className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">
                  Hasil Estimasi Harga
                </h2>
                <p className="text-gray-600 mt-2">
                  Berikut adalah estimasi biaya kanopi Anda berdasarkan spesifikasi yang dipilih.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <EnhancedResultPanel
            result={result}
            leadName={leadInfo.name || 'Pengguna'}
            projectId={projectId || 'N/A'}
            catalogTitle={catalogData?.title}
            onReset={handleReset}
            onBookSurvey={handleBookSurvey}
            canDownload={true}
            onDownloadPdf={handleDownloadPdf}
            customNotes={input.notes}
          />

          {showContactFormForPdf && result && (
            <ContactFormForPdf
              leadInfo={leadInfo}
              setLeadInfo={setLeadInfo}
              onClose={() => setShowContactFormForPdf(false)}
              onSaveLeadAndDownloadPdf={handleSaveLeadAndDownloadPdf}
            />
          )}
          {showSurveyModal && (
            <SurveyBookingModal
              open={showSurveyModal}
              onClose={() => setShowSurveyModal(false)}
              leadInfo={leadInfo}
              zoneId={input.zoneId}
              result={result}
              catalogTitle={catalogData?.title}
              projectId={projectId}
            />
          )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8" id="enhanced-calculator">
      {!hideTitle && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calculator className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">
                Kalkulator Harga Kanopi
              </h2>
              <p className="text-gray-600 mt-2">
                Hitung estimasi biaya kanopi Anda secara instan dengan mempertimbangkan waste material dan zona lokasi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <ProgressIndicator steps={steps} currentStep={currentStep - 1} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <EnhancedCalculatorInputForm
            input={input}
            setInput={setInput}
            catalogs={catalogs}
            zones={zones}
            catalogData={catalogData}
            catalogAddons={catalogAddons}
            selectedAddonIds={selectedAddonIds}
            setSelectedAddonIds={setSelectedAddonIds}
            dataError={dataError}
            setDataError={setDataError}
            uploading={uploading}
            setUploading={setUploading}
            attachments={attachments}
            setAttachments={setAttachments}
            setLogoUrl={setLogoUrl}
            leadInfo={leadInfo}
            setLeadInfo={setLeadInfo}
            setCompanyName={setCompanyName}
            setCompanyAddress={setCompanyAddress}
            setCompanyPhone={setCompanyPhone}
            setCompanyEmail={setCompanyEmail}
            setWaNumber={setWaNumber}
            setZones={setZones}
            setCatalogs={setCatalogs}
            onNextStep={handleNextStep}
            currentStep={currentStep}
            searchParams={searchParams}
            handleCatalogChange={handleCatalogChange}
          />
        </div>

        {/* Sidebar with Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="card bg-primary-light/30 border-primary/20">
              <h3 className="font-bold text-primary-dark mb-4">Ringkasan Pesanan</h3>
              
              {input.catalogId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Paket Terpilih</p>
                  <p className="font-semibold text-primary-dark">Paket Standard</p>
                </div>
              )}
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">Dimensi</p>
                <p className="font-semibold text-primary-dark">
                  {input.panjang}m × {input.lebar}m
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">Jenis Pesanan</p>
                <p className="font-semibold text-primary-dark">
                  {input.jenis === 'custom' ? 'Custom (Manual Quote)' : 'Standard (Auto Kalkulasi)'}
                </p>
              </div>
              
              {leadInfo.name && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Kontak</p>
                  <p className="font-semibold text-primary-dark">{leadInfo.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePreviousStep}
          disabled={currentStep === 1 || currentStep === 4 || (currentStep === 2 && !!catalogParam) || isLoading}
          className="btn btn-outline"
        >
          Kembali
        </button>
        
        {currentStep < 3 && (
          <button
            onClick={handleNextStep}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Memproses...
              </>
            ) : (
              currentStep === 2 ? 'Hitung Estimasi' : 'Lanjutkan'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
