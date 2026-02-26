import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Fonts if needed, but standard ones are usually enough for SPK
// Using standard Helvetica for clean look

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 120,
  },
  value: {
    flex: 1,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
    minHeight: 25,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 200,
    textAlign: 'center',
  },
  signatureSpace: {
    height: 60,
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

interface ContractPDFProps {
  contract: any;
  logoUrl?: string | null;
}

export const ContractPDF = ({ contract, logoUrl }: ContractPDFProps) => {
  const date = new Date(contract.created_at || new Date());
  const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
  const day = date.getDate();
  const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const terbilang = (val: number) => {
    // Basic implementation for Indonesian currency naming
    if (val === 0) return "Nol Rupiah";
    const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    const fn = (n: number): string => {
      if (n < 12) return units[n];
      if (n < 20) return fn(n - 10) + " Belas";
      if (n < 100) return fn(Math.floor(n / 10)) + " Puluh " + fn(n % 10);
      if (n < 200) return "Seratus " + fn(n - 100);
      if (n < 1000) return fn(Math.floor(n / 100)) + " Ratus " + fn(n % 100);
      if (n < 2000) return "Seribu " + fn(n - 1000);
      if (n < 1000000) return fn(Math.floor(n / 1000)) + " Ribu " + fn(n % 1000);
      if (n < 1000000000) return fn(Math.floor(n / 1000000)) + " Juta " + fn(n % 1000000);
      return String(n);
    }
    return (fn(val) + " Rupiah").replace(/\s+/g, ' ').trim();
  };

  const total = contract.total_value || 0;
  
  // Handle dynamic payment terms from JSON array or default 50-40-10 object
  let termsArray = [];
  if (Array.isArray(contract.payment_terms_json)) {
    termsArray = contract.payment_terms_json;
  } else {
    const defaultTerms = contract.payment_terms_json || { t1_percent: 50, t2_percent: 40, t3_percent: 10 };
    termsArray = [
      { percent: defaultTerms.t1_percent, label: `Termin 1 (${defaultTerms.t1_percent}%)` },
      { percent: defaultTerms.t2_percent, label: `Termin 2 (${defaultTerms.t2_percent}%)` },
      { percent: defaultTerms.t3_percent, label: `Termin 3 (${defaultTerms.t3_percent}%)` }
    ];
  }

  const lead = contract.leads || {};
  const customerProfile = contract.customer_profile || {};
  
  // Use data from customer profile if available, otherwise fallback to lead
  const clientName = customerProfile.name || lead.name || '_________________________';
  const clientKtp = customerProfile.ktp_number || contract.client_ktp || '_________________________';
  const clientAddress = customerProfile.address || lead.location || lead.address || '_________________________';
  const clientPhone = customerProfile.phone || lead.phone || '_________________________';

  const signatory = contract.erp_signatories || { name: 'Dedi Setiadi', job_title: 'Project Manager' };
  const attachments = contract.attachments || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with optional Logo */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={{ width: 120, marginBottom: 10, alignSelf: 'center' }} />}
          <Text style={styles.title}>SURAT PERINTAH KERJA (SPK) & PERSETUJUAN PROYEK</Text>
          <Text style={styles.subtitle}>Nomor: {contract.contract_number || '000/SPK/II/2026'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Pada hari ini, <Text style={styles.bold}>{dayName}</Text> tanggal <Text style={styles.bold}>{day}</Text> bulan <Text style={styles.bold}>{monthName}</Text> tahun <Text style={styles.bold}>{year}</Text>, yang bertanda tangan di bawah ini:
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. PIHAK PERTAMA (KLIEN)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <Text style={styles.value}>: {clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>No. KTP</Text>
            <Text style={styles.value}>: {clientKtp}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alamat Lokasi</Text>
            <Text style={styles.value}>: {clientAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>No. WhatsApp</Text>
            <Text style={styles.value}>: {clientPhone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. PIHAK KEDUA (KONTRAKTOR / PELAKSANA)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Perusahaan</Text>
            <Text style={styles.value}>: PT POHON KEAHLIAN DIGITAL</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Perwakilan</Text>
            <Text style={styles.value}>: {signatory.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.value}>: {signatory.job_title}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Kedua belah pihak sepakat untuk mengikatkan diri dalam Perjanjian Kerja Pembuatan dan Instalasi sesuai dengan rincian berikut:
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASAL 1: RUANG LINGKUP PEKERJAAN</Text>
          <Text style={styles.paragraph}>
            PIHAK PERTAMA memberikan persetujuan kepada PIHAK KEDUA untuk melaksanakan pekerjaan sesuai dengan Spesifikasi, Material, dan Desain yang tercantum pada Surat Penawaran Final Nomor: <Text style={styles.bold}>{contract.quotations?.quotation_number || '000/Q/II/2026'}</Text> (Terlampir dan menjadi satu kesatuan yang tidak terpisahkan dari SPK ini).
          </Text>
          {contract.scope_snapshot && (
            <View style={{ marginLeft: 15, marginTop: 5 }}>
              <Text style={{ fontSize: 9, color: '#666' }}>Rincian Pekerjaan:</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{contract.scope_snapshot}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASAL 2: NILAI PROYEK & TERMIN PEMBAYARAN</Text>
          <Text style={styles.paragraph}>
            Total Nilai Investasi Proyek yang disepakati adalah <Text style={styles.bold}>{formatCurrency(total)} ({terbilang(total)})</Text>. Pembayaran dilakukan secara bertahap (Termin) dengan rincian:
          </Text>
          <View style={{ marginLeft: 15 }}>
            {termsArray.map((term: any, idx: number) => {
              const amount = Math.ceil(total * (term.percent / 100));
              const isLast = idx === termsArray.length - 1;
              const finalAmount = isLast ? total - termsArray.slice(0, -1).reduce((acc: number, t: any) => acc + Math.ceil(total * (t.percent / 100)), 0) : amount;
              
              return (
                <Text key={idx} style={styles.paragraph}>
                  <Text style={styles.bold}>{term.label} - {formatCurrency(finalAmount)}</Text>: {
                    idx === 0 ? "Dibayarkan saat penandatanganan SPK ini untuk mengunci harga dan jadwal produksi material." :
                    idx === 1 ? "Dibayarkan saat material selesai difabrikasi di workshop dan siap dikirim (loading) ke lokasi PIHAK PERTAMA." :
                    "Dibayarkan maksimal 1x24 jam setelah seluruh pekerjaan selesai terpasang dengan baik dan diserahterimakan (BAST)."
                  }
                </Text>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASAL 3: REKENING PEMBAYARAN SAH</Text>
          <Text style={styles.paragraph}>
            Seluruh transaksi pembayaran WAJIB ditransfer ke rekening resmi perusahaan di bawah ini. PIHAK KEDUA tidak bertanggung jawab atas pembayaran yang ditransfer ke luar rekening ini:
          </Text>
          <View style={{ marginLeft: 15 }}>
            <Text>Bank Tujuan: <Text style={styles.bold}>PT Bank Permata, Tbk.</Text></Text>
            <Text>Nomor Rekening: <Text style={styles.bold}>702819520</Text></Text>
            <Text>Atas Nama: <Text style={styles.bold}>POHON KEAHLIAN DIGITAL PT</Text></Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASAL 4: WAKTU PELAKSANAAN & KETENTUAN</Text>
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.paragraph}>1. Waktu pengerjaan adalah <Text style={styles.bold}>14 Hari Kerja</Text>, terhitung sejak Termin 1 (DP) efektif diterima di rekening PIHAK KEDUA.</Text>
            <Text style={styles.paragraph}>2. Perubahan spesifikasi (Addendum) yang diminta PIHAK PERTAMA setelah SPK ditandatangani akan dikenakan penyesuaian biaya dan waktu.</Text>
            <Text style={styles.paragraph}>3. Hal-hal di luar kendali (Force Majeure) seperti cuaca ekstrem yang menghambat instalasi lapangan akan dikomunikasikan untuk penyesuaian jadwal.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>Demikian Surat Perjanjian Kerja ini dibuat dalam keadaan sadar dan tanpa paksaan.</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text>Tangerang, {day} {monthName} {year}</Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.bold}>PIHAK PERTAMA,</Text>
            <View style={styles.signatureSpace} />
            <Text>( {lead.name || '_______________________'} )</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.bold}>PIHAK KEDUA,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.bold}>{signatory.name}</Text>
            <Text>{signatory.job_title}</Text>
          </View>
        </View>

        {/* Dynamic Attachments Section */}
        {attachments.length > 0 && (
          <View break>
            <Text style={styles.sectionTitle}>LAMPIRAN VISUAL PROYEK</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {attachments.map((att: any, idx: number) => (
                <View key={idx} style={{ width: '45%', marginBottom: 20 }}>
                  <Text style={{ fontSize: 8, marginBottom: 5, color: '#666', textTransform: 'uppercase' }}>
                    Lampiran {idx + 1}: {att.type}
                  </Text>
                  <Image src={att.url} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 5, border: '1pt solid #eee' }} />
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>PT POHON KEAHLIAN DIGITAL | Dokumen ini diterbitkan secara digital oleh sistem ERP Kokohin.</Text>
      </Page>
    </Document>
  );
};
