import { createService } from '@/app/actions/servicesAdmin'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import ServiceForm from '@/components/admin/ServiceForm'

export default async function AdminServiceNewPage() {
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
    redirect('/admin/services')
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tambah Layanan</h1>
          <p className={styles.sub}>Kelola konten layanan website</p>
        </div>
        <Link href="/admin/services" className="btn btn-outline-dark">← Kembali</Link>
      </div>

      <div className={styles.section}>
        <div className="p-6">
          <ServiceForm onSubmit={action} submitLabel="Simpan Layanan" />
        </div>
      </div>
    </div>
  )
}

