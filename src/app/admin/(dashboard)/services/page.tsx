import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../page.module.css'
import Link from 'next/link'
import ServicesList from '@/components/admin/ServicesList'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default async function AdminServicesPage({ searchParams }: { searchParams?: Promise<{ error?: string; notice?: string }> }) {
  const sp = searchParams ? await searchParams : {}
  const errorParam = sp?.error
  const notice = sp?.notice
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

      {(errorParam || notice) && (
        <div className="px-8">
          {errorParam && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span>{decodeURIComponent(errorParam)}</span>
            </div>
          )}
          {!errorParam && notice === 'created' && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              <span>Layanan berhasil dibuat</span>
            </div>
          )}
          {!errorParam && notice === 'updated' && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              <span>Layanan berhasil diperbarui</span>
            </div>
          )}
          {!errorParam && notice === 'deleted' && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              <span>Layanan berhasil dihapus</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.section}>
        <div className="p-6"><ServicesList services={items} /></div>
      </div>
    </div>
  )
}
