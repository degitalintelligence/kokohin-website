import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin Login | Kokohin',
    description: 'Admin login Kokohin',
    robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return children
}
