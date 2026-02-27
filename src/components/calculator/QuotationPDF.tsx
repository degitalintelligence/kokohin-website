import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { CalculatorResult } from '@/lib/types';
import { resolveItemSpecs } from '@/lib/pdf-spec-utils';

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
  // table: {
  //   width: '100%',
  //   marginBottom: 30,
  // },
  // tableHeader: {
  //   flexDirection: 'row',
  //   backgroundColor: '#1D1D1B',
  //   color: '#FFFFFF',
  //   padding: 8,
  //   fontSize: 9,
  //   fontWeight: 700,
  //   borderRadius: 4,
  // },
  // tableRow: {
  //   flexDirection: 'row',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#EEEEEE',
  //   paddingVertical: 10,
  //   paddingHorizontal: 8,
  //   fontSize: 8,
  //   alignItems: 'flex-start',
  // },
  col1: { width: '5%', textAlign: 'center' },
  col2: { width: '45%' },
  col3: { width: '12%', textAlign: 'center' },
  col4: { width: '18%', textAlign: 'right' },
  col5: { width: '20%', textAlign: 'right' },
  itemSpecLabel: {
    fontSize: 7,
    color: '#666666',
    marginTop: 2,
  },
  itemSpecValue: {
    fontWeight: 700,
    color: '#333333',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  itemMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemDetails: {
    flex: 1,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 40,
  },
  totalsBox: {
    width: '45%',
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
  paymentTermsSection: {
    width: '50%',
    paddingRight: 20,
  },
  paymentTermItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
    color: '#666666',
  },
  attachmentsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  attachmentGrid: {
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  attachmentBox: {
    width: 150, 
    height: 150,
    borderRadius: 8, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#EEEEEE',
    backgroundColor: '#F9F9F9',
  },
  attachmentImage: {
    width: '100%', 
    height: '100%', 
    objectFit: 'cover',
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
    address?: string;
  };
  projectId: string | null;
  zoneName?: string | null;
  logoUrl?: string | null;
  attachments?: { url: string }[];
  items?: {
    name: string
    unit: string
    quantity: number
    unit_price: number
    subtotal: number
    catalog_id?: string
    rangka?: { name?: string };
    isian?: { name?: string };
    atap?: { name?: string };
    finishing?: { name?: string };
    builder_costs?: { name?: string; type?: string; section?: string }[];
  }[]; // The full ERP items with specifications
  paymentTerms?: {
    name: string;
    terms_json: {
      t1_percent: number;
      t2_percent: number;
      t3_percent: number;
      t1_desc?: string;
      t2_desc?: string;
      t3_desc?: string;
    };
  } | null;
}

// 3. MAIN COMPONENT
export const QuotationPDF: React.FC<QuotationPDFProps> = ({
  result,
  leadInfo,
  projectId,
  logoUrl,
  attachments = [],
  items = [],
  paymentTerms,
}) => {
  ensureFontsRegistered()
  const estimationNumber = projectId ? (projectId.startsWith('WEB-') ? projectId : `QTN-${projectId.slice(0, 8).toUpperCase()}`) : 'WEB-PREVIEW';
  const customerName = leadInfo.name || 'Customer';
  const customerAddress = leadInfo.address || '-';

  const totalPrice = result.estimatedPrice;
  const companyName = 'KOKOHIN';
  const companyAddress = 'Tangerang, Indonesia';
  const companyPhone = '0812-1234-5678';
  const companyEmail = 'hello@kokohin.com';
  const companyLogo =
    logoUrl ||
    process.env.NEXT_PUBLIC_COMPANY_LOGO_URL ||
    'https://via.placeholder.com/150x50.png?text=LOGO';

  const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: id });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER: KOP SURAT */}
        <View style={styles.header}>
          <View style={styles.logoInfo}>
            <PdfImage src={companyLogo} style={styles.logo} />
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>WhatsApp: {companyPhone} | Email: {companyEmail}</Text>
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>PENAWARAN</Text>
            <Text style={styles.docMeta}>Nomor: {estimationNumber}</Text>
            <Text style={styles.docMeta}>Tanggal: {currentDate}</Text>
          </View>
        </View>

        {/* PERIHAL & SALUTATION */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 15 }}>
            Perihal: Penawaran Investasi Pekerjaan Eksterior & Konstruksi
          </Text>
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 10 }}>Kepada Yth,</Text>
            <Text style={{ fontSize: 10, fontWeight: 700 }}>{customerName}</Text>
            <Text style={{ fontSize: 10 }}>di {customerAddress}</Text>
          </View>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>Dengan hormat,</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5, textAlign: 'justify' }}>
            Menindaklanjuti rencana pengerjaan fasilitas eksterior dan konstruksi di kediaman/lokasi Bapak/Ibu, kami dari {companyName} telah menyusun rincian penawaran secara komprehensif.
          </Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5, textAlign: 'justify', marginTop: 8 }}>
            Kami merancang penawaran ini dengan mengedepankan keamanan struktur, durabilitas material, dan estetika jangka panjang. Berikut adalah rincian spesifikasi dan nilai investasi untuk setiap item pekerjaan yang Bapak/Ibu butuhkan:
          </Text>
        </View>

        {/* A. RINCIAN SPESIFIKASI & INVESTASI (TABLE FORMAT) */}
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.sectionTitle, { fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 4, marginBottom: 15 }]}>
            A. RINCIAN SPESIFIKASI & INVESTASI
          </Text>

          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>No</Text>
              <Text style={styles.col2}>Deskripsi Item & Spesifikasi</Text>
              <Text style={styles.col3}>Volume</Text>
              <Text style={styles.col4}>Harga Satuan</Text>
              <Text style={styles.col5}>Subtotal</Text>
            </View>

            {/* Table Rows */}
            {items.map((item, idx) => {
              // Improved Extraction Logic with Data Validation
            const { rangkaUtama, rangkaDalam, atap, finishing } = resolveItemSpecs(item);

            const unitLabel = item.unit || 'm²';

              const itemImage = item.catalog_id && result.breakdown.find(b => b.name === item.name)?.image_url;

              return (
                <View key={idx} style={styles.tableRow} wrap={false}>
                  <Text style={styles.col1}>{idx + 1}</Text>
                  
                  <View style={styles.col2}>
                    <View style={styles.itemMainInfo}>
                      {itemImage && (
                        <PdfImage src={itemImage} style={styles.itemImage} />
                      )}
                      <View style={styles.itemDetails}>
                        <Text style={{ fontWeight: 700, fontSize: 9, marginBottom: 4 }}>{item.name}</Text>
                        {rangkaUtama && rangkaUtama !== '-' && (
                          <Text style={styles.itemSpecLabel}>Rangka Utama: <Text style={styles.itemSpecValue}>{rangkaUtama}</Text></Text>
                        )}
                        {rangkaDalam && rangkaDalam !== '-' && (
                          <Text style={styles.itemSpecLabel}>Isian / Jari-jari: <Text style={styles.itemSpecValue}>{rangkaDalam}</Text></Text>
                        )}
                        {atap && atap !== '-' && (
                          <Text style={styles.itemSpecLabel}>Atap / Cover: <Text style={styles.itemSpecValue}>{atap}</Text></Text>
                        )}
                        {finishing && finishing !== '-' && (
                          <Text style={styles.itemSpecLabel}>Finishing: <Text style={styles.itemSpecValue}>{finishing}</Text></Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.col3}>{item.quantity} {unitLabel}</Text>
                  <Text style={styles.col4}>Rp {item.unit_price.toLocaleString('id-ID')}</Text>
                  <Text style={styles.col5}>Rp {item.subtotal.toLocaleString('id-ID')}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* B. PEKERJAAN TAMBAHAN (If any) */}
        {/* Assuming addons are handled as items for now, or we can add a specific filter if they are marked */}

        {/* C. REKAPITULASI BIAYA & KETENTUAN */}
        <View style={{ marginTop: 20 }} wrap={false}>
          <Text style={[styles.sectionTitle, { fontSize: 11, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 4, marginBottom: 15 }]}>
            C. REKAPITULASI BIAYA & KETENTUAN (T&C)
          </Text>
          
          <View style={{ backgroundColor: '#1D1D1B', padding: 15, borderRadius: 8, marginBottom: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>ESTIMASI GRAND TOTAL:</Text>
            <Text style={{ color: '#E30613', fontSize: 20, fontWeight: 700 }}>Rp {totalPrice.toLocaleString('id-ID')}</Text>
            <Text style={{ color: '#AAAAAA', fontSize: 8, marginTop: 6 }}>
              (Catatan: Grand Total di atas merupakan akumulasi dari seluruh item pekerjaan utama beserta Add-on yang tercantum).
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: 700 }}>Syarat & Ketentuan Pekerjaan:</Text>
            
            <View style={{ marginLeft: 10, gap: 5 }}>
              <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: 700 }}>Validitas:</Text> Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.</Text>
              <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: 700 }}>Item Eksklusi:</Text> Harga di atas belum termasuk pekerjaan sipil/bobok tembok atau talang air kecuali disebutkan spesifik di atas.</Text>
              
              <View style={{ marginTop: 5 }}>
                <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Sistem Pembayaran:</Text>
                {paymentTerms ? (
                  <View style={{ marginLeft: 10, gap: 3 }}>
                    <Text style={{ fontSize: 9 }}>• {paymentTerms.terms_json.t1_percent}% Down Payment (DP) - Untuk booking jadwal produksi dan order material.</Text>
                    <Text style={{ fontSize: 9 }}>• {paymentTerms.terms_json.t2_percent}% Termin 2 - Saat material selesai fabrikasi dan siap kirim ke lokasi.</Text>
                    <Text style={{ fontSize: 9 }}>• {paymentTerms.terms_json.t3_percent}% Pelunasan - Maksimal 1x24 jam setelah pekerjaan selesai (BAST).</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 9, marginLeft: 10, color: '#666' }}>Sesuai dengan kesepakatan tertulis nantinya.</Text>
                )}
              </View>
              
              <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: 700 }}>Waktu Pelaksanaan:</Text> Estimasi 14 - 21 Hari Kerja (terhitung setelah DP diterima dan material tersedia).</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 30 }} wrap={false}>
          <Text style={{ fontSize: 10, lineHeight: 1.5, textAlign: 'justify' }}>
            Demikian penawaran ini kami sampaikan. Kami sangat terbuka untuk berdiskusi lebih lanjut guna menyesuaikan spesifikasi di atas dengan kebutuhan dan anggaran Bapak/Ibu.
          </Text>
          
          <View style={{ marginTop: 40, width: '100%', flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: 200, textAlign: 'center' }}>
              <Text style={{ fontSize: 10, marginBottom: 60 }}>Hormat Kami,</Text>
              <Text style={{ fontSize: 10, fontWeight: 700 }}>{companyName} Management</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>(Tanda Tangan & Stempel)</Text>
            </View>
          </View>
        </View>

        {/* ATTACHMENTS (New Page if many) */}
        {attachments.length > 0 && (
          <View style={{ marginTop: 40 }} break>
            <Text style={styles.sectionTitle}>LAMPIRAN: GAMBAR REFERENSI & DOKUMENTASI</Text>
            <View style={styles.attachmentGrid}>
              {attachments.map((att, idx) => (
                <View key={idx} style={styles.attachmentBox}>
                  <PdfImage src={att.url} style={styles.attachmentImage} />
                </View>
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
};
export default QuotationPDF;
