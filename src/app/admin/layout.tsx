import type { Metadata } from 'next'
import { ensureCurrentUserProfile } from '@/app/actions/users'

export const metadata: Metadata = {
    title: {
        default: 'Admin | Kokohin',
        template: '%s | Admin Kokohin',
    },
    description: 'Admin panel Kokohin',
    robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await ensureCurrentUserProfile()
    return children
}
