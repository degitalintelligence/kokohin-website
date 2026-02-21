import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: {
    default: 'Kokohin — Kontraktor Kanopi Profesional',
    template: '%s | Kokohin',
  },
  description:
    'Kokohin menyediakan jasa pemasangan kanopi berkualitas: baja ringan, polycarbonate, kaca, spandek, membrane, dan pergola. Berpengalaman, bergaransi, harga terjangkau.',
  keywords: ['kanopi', 'kontraktor kanopi', 'kanopi baja ringan', 'kanopi polycarbonate', 'kanopi kaca', 'carport', 'pergola'],
  openGraph: {
    title: 'Kokohin — Kontraktor Kanopi Profesional',
    description: 'Jasa pemasangan kanopi berkualitas dengan berbagai pilihan material. Berpengalaman, bergaransi.',
    type: 'website',
    locale: 'id_ID',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={montserrat.variable}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
