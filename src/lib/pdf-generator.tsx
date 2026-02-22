import { pdf, Document, Page, Text, View, StyleSheet, Font, Image as PdfImage } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import type { Estimation, EstimationItem, ErpProject } from '@/lib/types'

export interface PdfQuotationData {
  project: ErpProject
  estimation: Estimation
  items: EstimationItem[]
  paymentTerms?: string[]
  logoUrl?: string | null
}

const COLORS = {
  primary: '#E30613',
  dark: '#1D1D1B',
  light: '#F8F8F8',
  gray: '#6B7280'
} as const

const COMPANY_NAME = 'KOKOHIN'
const COMPANY_ADDRESS =
  process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Tangerang, Indonesia'
const COMPANY_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE ||
  process.env.NEXT_PUBLIC_WA_NUMBER ||
  '-'
const COMPANY_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || '-'
const COMPANY_HOURS =
  process.env.NEXT_PUBLIC_CONTACT_HOURS || ''
const COMPANY_WEBSITE =
  process.env.NEXT_PUBLIC_COMPANY_WEBSITE || 'www.kokohin.com'

// Determine font base URL - prefer environment variable for server-side rendering
const fontBase = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '');
const fontPath = fontBase ? `${fontBase}/fonts` : '/fonts';

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: `${fontPath}/Montserrat-Regular.ttf`, fontWeight: 'normal' },
    { src: `${fontPath}/Montserrat-Bold.ttf`, fontWeight: 'bold' },
    { src: `${fontPath}/Montserrat-SemiBold.ttf`, fontWeight: 'semibold' },
  ],
})

Font.registerHyphenationCallback(word => [word])

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Montserrat',
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 20
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoImage: {
    width: 60,
    height: 60,
    objectFit: 'contain'
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  companyInfo: {
    flex: 1
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4
  },
  companyTagline: {
    fontSize: 10,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  quotationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'right',
    marginBottom: 4
  },
  quotationSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'right'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 6
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  column: {
    width: '48%'
  },
  label: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: 'semibold'
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  tableCell: {
    fontSize: 10,
    color: COLORS.dark
  },
  totalSection: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 8,
    marginTop: 10
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: 'semibold'
  },
  totalValue: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: 'bold'
  },
  finalTotal: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold'
  },
  paymentTerms: {
    marginTop: 30
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: 6
  },
  termBullet: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 8
  },
  termText: {
    fontSize: 10,
    color: COLORS.dark,
    flex: 1
  },
  disclaimerBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  disclaimerTitle: {
    fontSize: 10,
    color: COLORS.dark,
    fontWeight: 'bold',
    marginBottom: 4
  },
  disclaimerText: {
    fontSize: 9,
    color: COLORS.gray,
    lineHeight: 1.4
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: COLORS.gray,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20
  }
})

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Create PDF component
const QuotationDocument = (data: PdfQuotationData) => {
  const formattedDate = format(new Date(), 'dd MMMM yyyy', { locale: id })
  const quotationNumber = `KOK-${data.project.id.slice(0, 8).toUpperCase()}-V${data.estimation.version_number}`
  const companyLogo =
    data.logoUrl ||
    process.env.NEXT_PUBLIC_COMPANY_LOGO_URL ||
    'https://via.placeholder.com/150x50.png?text=LOGO'

  // Default payment terms
  const defaultPaymentTerms = [
    'DP 50% saat kontrak ditandatangani',
    'Pelunasan 50% saat material tiba di lokasi',
    'Pembayaran via transfer bank (BCA/Mandiri/BNI)',
    'Quotation berlaku 14 hari dari tanggal diterbitkan',
    'Harga sudah termasuk PPN 11%',
    'Garansi konstruksi 2 tahun, material 5 tahun'
  ]

  const paymentTerms = data.paymentTerms || defaultPaymentTerms

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <PdfImage src={companyLogo} style={styles.logoImage} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{COMPANY_NAME}</Text>
              <Text style={styles.companyTagline}>Kontraktor Kanopi & Pagar Profesional</Text>
              <Text style={styles.companyTagline}>{COMPANY_ADDRESS}</Text>
              <Text style={styles.companyTagline}>Telp: {COMPANY_PHONE}</Text>
              <Text style={styles.companyTagline}>Email: {COMPANY_EMAIL}</Text>
              {COMPANY_HOURS && (
                <Text style={styles.companyTagline}>Jam Operasional: {COMPANY_HOURS}</Text>
              )}
            </View>
          </View>
          <View>
            <Text style={styles.quotationTitle}>QUOTATION</Text>
            <Text style={styles.quotationSubtitle}>No: {quotationNumber}</Text>
            <Text style={styles.quotationSubtitle}>Tanggal: {formattedDate}</Text>
          </View>
        </View>

        {/* Customer & Project Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Proyek</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.label}>Nama Customer</Text>
              <Text style={styles.value}>{data.project.customer_name}</Text>
              <Text style={styles.label}>Nomor WhatsApp</Text>
              <Text style={styles.value}>{data.project.phone}</Text>
              <Text style={styles.label}>Alamat</Text>
              <Text style={styles.value}>{data.project.address || 'Tidak dicantumkan'}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Jenis Proyek</Text>
              <Text style={styles.value}>{data.project.status === 'Need Manual Quote' ? 'Custom Request' : 'Standard Kanopi'}</Text>
              <Text style={styles.label}>Catatan</Text>
              <Text style={styles.value}>{data.project.custom_notes || 'Tidak ada catatan'}</Text>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{data.project.status}</Text>
            </View>
          </View>
        </View>

        {/* Estimation Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian Biaya</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Item</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Satuan</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Subtotal</Text>
            </View>
            
            {/* Table Rows */}
            {data.items.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '40%' }]}>
                  {item.material?.name || `Material ${index + 1}`}
                </Text>
                <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                  {item.qty_charged}
                </Text>
                <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                  {item.material?.unit || 'unit'}
                </Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right' }]}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HPP Material & Jasa</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.estimation.total_hpp)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Margin ({data.estimation.margin_percentage}%)</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.estimation.total_selling_price - data.estimation.total_hpp)}
            </Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 12 }]}>
            <Text style={styles.totalLabel}>Total Harga Jual</Text>
            <Text style={styles.finalTotal}>{formatCurrency(data.estimation.total_selling_price)}</Text>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTerms}>
          <Text style={styles.sectionTitle}>Syarat Pembayaran</Text>
          {paymentTerms.map((term, index) => (
            <View key={index} style={styles.termItem}>
              <View style={styles.termBullet} />
              <Text style={styles.termText}>{term}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>SYARAT & KETENTUAN (WAJIB DIBACA)</Text>
          <Text style={styles.disclaimerText}>
            1. Harga di atas adalah estimasi awal berdasarkan data yang tercatat di sistem.
          </Text>
          <Text style={styles.disclaimerText}>
            2. Harga final atau harga kontrak dapat berubah setelah tim Kokohin melakukan survei lokasi aktual.
          </Text>
          <Text style={styles.disclaimerText}>
            3. Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan atau sesuai kesepakatan tertulis.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {COMPANY_NAME} • {COMPANY_ADDRESS} • WhatsApp: {COMPANY_PHONE} • {COMPANY_WEBSITE}
          </Text>
          <Text>Quotation ini dibuat secara otomatis oleh sistem Kokohin Mini‑ERP. Harap simpan untuk referensi.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateQuotationPdf(data: PdfQuotationData): Promise<Blob> {
  try {
    const pdfInstance = pdf(QuotationDocument(data))
    const blob = await pdfInstance.toBlob()
    return blob
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    throw new Error('Gagal menghasilkan PDF quotation')
  }
}

// Helper function to download PDF
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper function to generate and download PDF
export async function generateAndDownloadQuotation(data: PdfQuotationData): Promise<void> {
  try {
    const blob = await generateQuotationPdf(data)
    const filename = `Quotation-KOK-${data.project.id.slice(0, 8)}-V${data.estimation.version_number}.pdf`
    downloadPdf(blob, filename)
  } catch (error) {
    console.error('Failed to generate and download PDF:', error)
    throw error
  }
}
