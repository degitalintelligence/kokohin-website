import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Standard Helvetica or register Montserrat if needed
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logo: {
    width: 120,
    marginBottom: 10,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E30613',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  invoiceMeta: {
    textAlign: 'right',
    marginTop: 5,
  },
  metaLabel: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerSection: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 40,
  },
  customerBox: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#E30613',
    textTransform: 'uppercase',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 2,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 9,
    color: '#666',
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1D1D1B',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  tableCell: {
    fontSize: 9,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  summaryBox: {
    width: 200,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E30613',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E30613',
  },
  bankSection: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    width: '60%',
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#E30613',
    textTransform: 'uppercase',
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bankLabel: {
    width: 80,
    fontSize: 8,
    color: '#666',
  },
  bankValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  bold: {
    fontWeight: 'bold',
  }
});

interface InvoicePDFProps {
  invoice: any;
  logoUrl?: string | null;
}

export const InvoicePDF = ({ invoice, logoUrl }: InvoicePDFProps) => {
  const contract = invoice.erp_contracts || {};
  const quotation = contract.erp_quotations || {};
  const lead = quotation.leads || {};
  const items = invoice.erp_invoice_items || [];
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <Text style={styles.bold}>PT POHON KEAHLIAN DIGITAL</Text>
            <Text style={styles.companyInfo}>Jl. Raya Serpong, BSD City, Tangerang Selatan</Text>
            <Text style={styles.companyInfo}>WhatsApp: 0813-1418-5400 | Email: hi@kokohin.com</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <View style={styles.invoiceMeta}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.created_at)}</Text>
              <Text style={styles.metaLabel}>Jatuh Tempo</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.due_date)}</Text>
            </View>
          </View>
        </View>

        {/* Customer & Project Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerBox}>
            <Text style={styles.sectionLabel}>Ditagihkan Kepada:</Text>
            <Text style={styles.customerName}>{lead.name || 'Pelanggan'}</Text>
            <Text style={styles.customerDetail}>{lead.address || lead.location || '-'}</Text>
            <Text style={styles.customerDetail}>{lead.phone || '-'}</Text>
          </View>
          <View style={styles.customerBox}>
            <Text style={styles.sectionLabel}>Referensi Proyek:</Text>
            <Text style={styles.customerDetail}>No. Kontrak: {contract.contract_number || '-'}</Text>
            <Text style={styles.customerDetail}>No. Penawaran: {quotation.quotation_number || '-'}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Deskripsi Pekerjaan</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.5, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Harga</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
          </View>
          
          {items.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
              <Text style={[styles.tableCell, { flex: 0.5, textAlign: 'center' }]}>{item.quantity} {item.unit}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.unit_price)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
          
          {items.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: '#999', fontStyle: 'italic' }]}>
                Data item tagihan tidak ditemukan.
              </Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 9 }}>Total Tagihan:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{formatCurrency(invoice.total_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 9, color: 'green' }}>Sudah Dibayar:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: 'green' }}>{formatCurrency(invoice.amount_paid)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sisa Tagihan:</Text>
              <Text style={styles.totalValue}>{formatCurrency(balance)}</Text>
            </View>
          </View>
        </View>

        {/* Bank Info */}
        <View style={styles.bankSection}>
          <Text style={styles.bankTitle}>Informasi Rekening Pembayaran:</Text>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Nama Bank</Text>
            <Text style={styles.bankValue}>PT Bank Permata, Tbk.</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Nomor Rekening</Text>
            <Text style={styles.bankValue}>702819520</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Atas Nama</Text>
            <Text style={styles.bankValue}>POHON KEAHLIAN DIGITAL PT</Text>
          </View>
          <Text style={{ fontSize: 7, color: '#999', marginTop: 10, fontStyle: 'italic' }}>
            * Harap sertakan nomor invoice pada berita transfer untuk memudahkan verifikasi.
          </Text>
        </View>

        <Text style={styles.footer}>PT POHON KEAHLIAN DIGITAL | Invoice ini diterbitkan secara digital oleh sistem ERP Kokohin.</Text>
      </Page>
    </Document>
  );
};
