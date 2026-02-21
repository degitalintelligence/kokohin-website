import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: {
        default: 'Admin | Kokohin',
        template: '%s | Admin Kokohin',
    },
    description: 'Admin panel Kokohin',
    robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return children
}
