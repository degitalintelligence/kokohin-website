import { createService } from '@/app/actions/servicesAdmin'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import ServiceForm from '@/components/admin/ServiceForm'
import CatalogSaveButton from '../../catalogs/components/CatalogSaveButton'

export default async function AdminServiceNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  async function action(formData: FormData) {
    'use server'
    const supabase = await createClient()
    // if compressed image provided, upload to storage
    const file = formData.get('image_file') as File | null
    if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
      const fileName = `svc_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('services').upload(fileName, file, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('services').getPublicUrl(fileName)
        formData.set('image_url', publicUrl)
      }
      formData.delete('image_file')
    }
    const res = await createService(formData)
    if ('error' in res && res.error) {
      redirect(`/admin/services/new?error=${encodeURIComponent(res.error)}`)
    }
    redirect('/admin/services?notice=created')
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tambah Layanan</h1>
          <p className={styles.sub}>Kelola konten layanan website</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/services" className="btn btn-outline-dark">← Kembali</Link>
          <CatalogSaveButton formId="serviceFormNew" label="Simpan Layanan" />
        </div>
      </div>

      <div className={styles.section}>
        <div className="p-6">
          {errorMessage && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {decodeURIComponent(errorMessage)}
            </div>
          )}
          <ServiceForm formId="serviceFormNew" hideInternalSubmit onSubmit={action} submitLabel="Simpan Layanan" />
        </div>
      </div>
    </div>
  )
}
