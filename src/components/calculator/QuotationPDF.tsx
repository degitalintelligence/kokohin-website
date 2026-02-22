import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CalculatorResult } from '@/lib/types';

let fontsRegistered = false
function ensureFontsRegistered() {
  if (fontsRegistered) return
  if (typeof window === 'undefined') return
  const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin || ''
  const path = base ? `${base}/fonts` : '/fonts'
  try {
    Font.register({ family: 'Montserrat', src: `${path}/Montserrat-Regular.ttf` })
    Font.register({ family: 'Montserrat', src: `${path}/Montserrat-Bold.ttf`, fontWeight: 700 })
    fontsRegistered = true
  } catch {
  }
}

// 2. STYLING KELAS ATAS (Mirip Tailwind tapi untuk React PDF)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Montserrat',
    backgroundColor: '#FFFFFF',
    color: '#1D1D1B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E30613',
  },
  logoInfo: {
    flexDirection: 'column',
    width: '50%',
  },
  logo: {
    width: 120,
    height: 'auto',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
  },
  docInfo: {
    width: '40%',
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#E30613',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  docMeta: {
    fontSize: 10,
    color: '#1D1D1B',
    marginBottom: 4,
  },
  customerSection: {
    flexDirection: 'row',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  customerBox: {
    width: '50%',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#E30613',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  customerText: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1D1D1B',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 10,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    padding: 10,
    fontSize: 10,
    alignItems: 'center',
  },
  col1: { width: '5%', textAlign: 'center' },
  col2: { width: '45%' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '35%', textAlign: 'right' },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 40,
  },
  totalsBox: {
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    fontSize: 11,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1D1D1B',
    fontSize: 14,
    fontWeight: 700,
    color: '#E30613',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  disclaimer: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.5,
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#E30613',
  },
});

// TYPE DEFINITIONS
interface QuotationPDFProps {
  result: CalculatorResult;
  leadInfo: {
    name: string;
    whatsapp: string;
  };
  projectId: string | null;
  zoneName?: string | null;
  logoUrl?: string | null;
  specifications: string;
  projectArea: number;
  projectType?: string;
  areaUnit?: string;
}

// 3. MAIN COMPONENT
export const QuotationPDF: React.FC<QuotationPDFProps> = ({
  result,
  leadInfo,
  projectId,
  zoneName,
  logoUrl,
  specifications,
  projectArea,
  projectType = 'Pekerjaan Pembuatan Kanopi',
  areaUnit = 'm²',
}) => {
  ensureFontsRegistered()
  const estimationNumber = projectId ? `WEB-${projectId.slice(0, 8).toUpperCase()}` : 'WEB-PREVIEW';
  const customerName = leadInfo.name || 'Customer';
  const customerPhone = leadInfo.whatsapp || '-';
  const zoneLabel = zoneName || 'Belum dipilih';
  const areaLabel = `${projectArea} ${areaUnit}`;

  const totalPrice = result.estimatedPrice;
  const companyName = 'KOKOHIN';
  const companyAddress = process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Tangerang, Indonesia';
  const companyPhone =
    process.env.NEXT_PUBLIC_CONTACT_PHONE ||
    process.env.NEXT_PUBLIC_WA_NUMBER ||
    '-';
  const companyEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '-';
  const companyHours = process.env.NEXT_PUBLIC_CONTACT_HOURS || '';
  const companyLogo =
    logoUrl ||
    process.env.NEXT_PUBLIC_COMPANY_LOGO_URL ||
    'https://via.placeholder.com/150x50.png?text=LOGO';

  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: id });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER: LOGO & INFO KANTOR vs INFO DOKUMEN */}
        <View style={styles.header}>
          <View style={styles.logoInfo}>
            <PdfImage src={companyLogo} style={styles.logo} />
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>Telp: {companyPhone}</Text>
            <Text style={styles.companyDetails}>Email: {companyEmail}</Text>
            {companyHours && (
              <Text style={styles.companyDetails}>Jam Operasional: {companyHours}</Text>
            )}
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.docMeta}>No. Estimasi: {estimationNumber}</Text>
            <Text style={styles.docMeta}>Tanggal: {currentDate}</Text>
          </View>
        </View>

        {/* CUSTOMER INFO BLOCK */}
        <View style={styles.customerSection}>
          <View style={styles.customerBox}>
            <Text style={styles.sectionTitle}>Estimasi Untuk:</Text>
            <Text style={[styles.customerText, { fontWeight: 700 }]}>{customerName}</Text>
            <Text style={styles.customerText}>Telp / WA: {customerPhone}</Text>
          </View>
          <View style={styles.customerBox}>
            <Text style={styles.sectionTitle}>Detail Proyek:</Text>
            <Text style={[styles.customerText, { fontWeight: 700 }]}>{projectType}</Text>
            <Text style={styles.customerText}>Luas Area: {areaLabel}</Text>
            <Text style={styles.customerText}>Zona Lokasi: {zoneLabel}</Text>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>No</Text>
            <Text style={styles.col2}>Deskripsi Material / Pekerjaan</Text>
            <Text style={styles.col3}>Qty</Text>
            <Text style={styles.col4}>Subtotal</Text>
          </View>
          
          {/* Table Rows */}
          <View style={styles.tableRow} key={1}>
            <Text style={styles.col1}>1</Text>
            <Text style={styles.col2}>{projectType} - {specifications}</Text>
            <Text style={styles.col3}>{areaLabel}</Text>
            <Text style={styles.col4}>
              Rp {totalPrice.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        {/* TOTALS SECTION */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRowFinal}>
              <Text>TOTAL ESTIMASI</Text>
              <Text>Rp {totalPrice.toLocaleString('id-ID')}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER & DISCLAIMER */}
        <View style={styles.footer}>
          <View style={styles.disclaimer}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>SYARAT & KETENTUAN (WAJIB DIBACA):</Text>
            <Text>1. Harga di atas adalah ESTIMASI AWAL berdasarkan ukuran yang diberikan melalui sistem.</Text>
            <Text>2. Harga final / harga kontrak dapat berubah setelah tim Kokohin melakukan SURVEI LOKASI aktual.</Text>
            <Text>3. Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};
export default QuotationPDF;
