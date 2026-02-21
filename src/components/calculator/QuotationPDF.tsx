import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatRupiah } from '@/lib/calculator';
import type { CalculatorResult } from '@/lib/types';

// Register font (optional, using standard Helvetica for now to be safe)
// Font.register({ family: 'Montserrat', src: '...' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E30613',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 40, // Adjust aspect ratio as needed
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
    color: '#1D1D1B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E30613',
    marginBottom: 10,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 20,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#333333',
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D1D1B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#E30613',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E30613',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E30613',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  },
  disclaimer: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  customerInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  customerText: {
    fontSize: 12,
    marginBottom: 4,
  },
});

interface QuotationPDFProps {
  result: CalculatorResult;
  leadInfo: {
    name: string;
    whatsapp: string;
  };
  projectId?: string | null;
}

const QuotationPDF = ({ result, leadInfo, projectId }: QuotationPDFProps) => {
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#E30613' }}>KOKOHIN</Text>
            <Text style={{ fontSize: 10, color: '#666666' }}>Kanopi & Konstruksi</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>Kokohin Construction</Text>
            <Text>Jakarta, Indonesia</Text>
            <Text>WA: 0812-3456-7890</Text>
            <Text>www.kokohin.com</Text>
          </View>
        </View>

        <Text style={styles.title}>PENAWARAN HARGA</Text>
        <Text style={styles.subtitle}>Tanggal: {today} | No. Ref: {projectId ? projectId.substring(0, 8).toUpperCase() : 'DRAFT'}</Text>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#1D1D1B' }}>Informasi Pelanggan</Text>
          <Text style={styles.customerText}>Nama: {leadInfo.name}</Text>
          <Text style={styles.customerText}>WhatsApp: {leadInfo.whatsapp}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 15, color: '#1D1D1B' }}>Detail Estimasi</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Luas Area</Text>
            <Text style={styles.value}>{result.luas} m²</Text>
          </View>

          {/* We hide the detailed breakdown here as well, per PRD */}
          <View style={styles.row}>
            <Text style={styles.label}>Kategori Pekerjaan</Text>
            <Text style={styles.value}>Pemasangan Kanopi</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Material & Jasa</Text>
            <Text style={styles.value}>Included</Text>
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ESTIMASI TOTAL</Text>
            <Text style={styles.totalValue}>{formatRupiah(result.estimatedPrice)}</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text>
            Catatan: Harga ini adalah estimasi awal berdasarkan input mandiri. Harga final yang mengikat akan diberikan setelah tim Kokohin melakukan survei lokasi untuk pengukuran presisi. Harga sudah termasuk PPN 11%.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Terima kasih telah mempercayakan kebutuhan konstruksi Anda kepada Kokohin.</Text>
          <Text>© {new Date().getFullYear()} Kokohin. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotationPDF;
