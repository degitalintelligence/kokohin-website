import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../page.module.css'
import Link from 'next/link'
import ServicesList from '@/components/admin/ServicesList'

export default async function AdminServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('order', { ascending: true })

  type ServiceRow = {
    id: string | number
    name: string
    slug: string
    order?: number | null
    is_active?: boolean | null
  }
  const items = (services || []).map((s: ServiceRow) => ({
    id: String(s.id),
    name: s.name,
    slug: s.slug,
    order: s.order ?? null,
    is_active: s.is_active ?? null,
  }))

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Manajemen Layanan</h1>
          <p className={styles.sub}>Tambah, edit, dan nonaktifkan layanan website</p>
        </div>
        <Link href="/admin/services/new" className="btn btn-primary">Tambah Layanan</Link>
      </div>

      <div className={styles.section}>
        <div className="p-6"><ServicesList services={items} /></div>
      </div>
    </div>
  )
}
