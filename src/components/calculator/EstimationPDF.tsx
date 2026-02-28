import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image as PdfImage } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import type { CalculatorResult } from '@/lib/types'

let fontsRegistered = false

function ensureFontsRegistered() {
  if (fontsRegistered) return
  if (typeof window === 'undefined') return
  const path = '/fonts'
  try {
    Font.register({ family: 'Montserrat', src: `${path}/Montserrat-Regular.ttf` })
    Font.register({ family: 'Montserrat', src: `${path}/Montserrat-Bold.ttf`, fontWeight: 700 })
    fontsRegistered = true
  } catch {
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Montserrat',
    backgroundColor: '#FFFFFF',
    color: '#1D1D1B',
    fontSize: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  companyBlock: {
    maxWidth: '55%'
  },
  logo: {
    height: 40,
    marginBottom: 6
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700
  },
  companyInfo: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2
  },
  estimationBlock: {
    alignItems: 'flex-end'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#E30613',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280'
  },
  meta: {
    marginTop: 8,
    textAlign: 'right'
  },
  metaLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    textTransform: 'uppercase'
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 2
  },
  clientSection: {
    flexDirection: 'row',
    marginBottom: 16
  },
  clientBox: {
    flex: 1
  },
  clientLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#E30613',
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 2
  },
  clientName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2
  },
  clientDetail: {
    fontSize: 9,
    color: '#6B7280'
  },
  infoSection: {
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  infoLabel: {
    fontSize: 9,
    color: '#6B7280'
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 600
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6'
  },
  headerCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB'
  },
  row: {
    flexDirection: 'row'
  },
  cell: {
    padding: 6,
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB'
  },
  summarySection: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: '55%'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6B7280'
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 700
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 8,
    color: '#6B7280',
    lineHeight: 1.4
  }
})

interface EstimationPDFProps {
  result: CalculatorResult
  leadName: string
  projectId: string | null
  logoUrl: string | null
  companyName: string | null
  companyAddress: string | null
  companyPhone: string | null
  companyEmail: string | null
  catalogTitle?: string | null
}

const EstimationPDF: React.FC<EstimationPDFProps> = ({
  result,
  leadName,
  projectId,
  logoUrl,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  catalogTitle
}) => {
  ensureFontsRegistered()
  const estimationNumber = projectId ? `EST-${projectId.slice(0, 8).toUpperCase()}` : 'EST-WEB-DEMO'
  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: id })
  const unit = result.unitUsed || 'm2'
  const unitLabel = unit === 'm2' ? 'm²' : unit === 'm1' ? 'm¹' : 'unit'
  const volumeValue = unit === 'm2' ? result.luas : result.computedQty ?? result.luas

  const cleanedItems = (result.breakdown || []).filter((item) => {
    const hasName = typeof item.name === 'string' && item.name.trim().length > 0
    const qtyOk = typeof item.qtyCharged === 'number' && Number.isFinite(item.qtyCharged) && item.qtyCharged > 0
    const priceOk = typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit) && item.pricePerUnit >= 0
    const subtotalOk = typeof item.subtotal === 'number' && Number.isFinite(item.subtotal) && item.subtotal >= 0
    return hasName && qtyOk && priceOk && subtotalOk
  })

  const syntheticItems = () => {
    if (!volumeValue || volumeValue <= 0) return []
    if (!result.estimatedPrice || result.estimatedPrice <= 0) return []
    const pricePerUnit = result.estimatedPrice / volumeValue
    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) return []
    return [
      {
        name: catalogTitle && catalogTitle.trim().length > 0 ? catalogTitle : 'Estimasi pekerjaan',
        qtyCharged: volumeValue,
        unit: unitLabel,
        pricePerUnit,
        subtotal: result.estimatedPrice
      }
    ]
  }

  const items = cleanedItems.length > 0 ? cleanedItems : syntheticItems()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            {logoUrl && <PdfImage src={logoUrl} style={styles.logo} />}
            <Text style={styles.companyName}>{companyName && companyName.trim().length > 0 ? companyName : 'KOKOHIN'}</Text>
            {companyAddress && companyAddress.trim().length > 0 && (
              <Text style={styles.companyInfo}>{companyAddress}</Text>
            )}
            {(companyPhone || companyEmail) && (
              <Text style={styles.companyInfo}>
                {companyPhone ? `WhatsApp: ${companyPhone}` : ''}
                {companyPhone && companyEmail ? ' | ' : ''}
                {companyEmail ? `Email: ${companyEmail}` : ''}
              </Text>
            )}
          </View>
          <View style={styles.estimationBlock}>
            <Text style={styles.title}>Estimation</Text>
            <Text style={styles.subtitle}>Estimasi pekerjaan kanopi dari Kalkulator Kokohin</Text>
            <View style={styles.meta}>
              <Text style={styles.metaLabel}>Estimation No.</Text>
              <Text style={styles.metaValue}>{estimationNumber}</Text>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaValue}>{currentDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.clientSection}>
          <View style={styles.clientBox}>
            <Text style={styles.clientLabel}>Kepada</Text>
            <Text style={styles.clientName}>{leadName || 'Customer'}</Text>
            <Text style={styles.clientDetail}>Alamat akan dilengkapi pada penawaran resmi.</Text>
          </View>
          <View style={styles.clientBox}>
            <Text style={styles.clientLabel}>Ringkasan Estimasi</Text>
            <Text style={styles.clientDetail}>
              Volume: {volumeValue.toLocaleString('id-ID')} {unitLabel}
            </Text>
            <Text style={styles.clientDetail}>
              Total Estimasi: {result.estimatedPrice.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: '6%' }]}>No</Text>
            <Text style={[styles.headerCell, { width: '40%' }]}>Deskripsi</Text>
            <Text style={[styles.headerCell, { width: '14%', textAlign: 'right' }]}>Volume</Text>
            <Text style={[styles.headerCell, { width: '10%' }]}>Satuan</Text>
            <Text style={[styles.headerCell, { width: '15%', textAlign: 'right' }]}>Harga Satuan</Text>
            <Text style={[styles.headerCell, { width: '15%', textAlign: 'right', borderRightWidth: 0 }]}>Subtotal</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: '6%' }]}>{idx + 1}</Text>
              <Text style={[styles.cell, { width: '40%' }]}>{item.name}</Text>
              <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>
                {item.qtyCharged.toLocaleString('id-ID')}
              </Text>
              <Text style={[styles.cell, { width: '10%' }]}>{item.unit}</Text>
              <Text style={[styles.cell, { width: '15%', textAlign: 'right' }]}>
                {item.pricePerUnit.toLocaleString('id-ID')}
              </Text>
              <Text style={[styles.cell, { width: '15%', textAlign: 'right', borderRightWidth: 0 }]}>
                {item.subtotal.toLocaleString('id-ID')}
              </Text>
            </View>
          ))}
          {items.length === 0 && (
            <View style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: '100%', borderRightWidth: 0 }]}>
                Data estimasi tidak tersedia.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Estimasi untuk Klien</Text>
            <Text style={styles.summaryValue}>
              {result.estimatedPrice.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Estimasi ini dihitung secara otomatis berdasarkan data yang Anda masukkan di kalkulator Kokohin.
          Nilai di atas bukan merupakan penawaran resmi dan dapat berubah setelah survei lapangan, penyesuaian desain,
          serta konfirmasi spesifikasi final. Dokumen ini hanya digunakan sebagai acuan awal budgeting.
        </Text>
      </Page>
    </Document>
  )
}

export default EstimationPDF

