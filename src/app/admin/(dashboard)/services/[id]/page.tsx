import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import ServiceForm from '@/components/admin/ServiceForm'
import { deleteService, updateService } from '@/app/actions/servicesAdmin'
import CatalogSaveButton from '../../catalogs/components/CatalogSaveButton'

export default async function AdminServiceEditPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ error?: string }> }) {
  const { id } = await params
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: svc, error } = await supabase.from('services').select('*').eq('id', id).maybeSingle()
  if (error || !svc) {
    redirect('/admin/services')
  }

  async function action(formData: FormData) {
    'use server'
    const supabase = await createClient()
    // handle optional image upload
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
    const res = await updateService(id, formData)
    if ('error' in res && res.error) {
      redirect(`/admin/services/${id}?error=${encodeURIComponent(res.error)}`)
    }
    redirect('/admin/services?notice=updated')
  }

  async function onDelete() {
    'use server'
    const res = await deleteService(id)
    if ('error' in res && res.error) {
      redirect(`/admin/services/${id}?error=${encodeURIComponent(res.error)}`)
    }
    redirect('/admin/services?notice=deleted')
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Layanan</h1>
          <p className={styles.sub}>Perbarui konten layanan dan SEO</p>
        </div>
        <div className="flex gap-2">
          <form action={onDelete}>
            <button className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50">Hapus</button>
          </form>
          <Link href="/admin/services" className="btn btn-outline-dark">← Kembali</Link>
          <CatalogSaveButton formId="serviceFormEdit" label="Simpan Perubahan" />
        </div>
      </div>

      <div className={styles.section}>
        <div className="p-6">
          {errorMessage && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {decodeURIComponent(errorMessage)}
            </div>
          )}
          <ServiceForm
            formId="serviceFormEdit"
            hideInternalSubmit
            defaultValues={{
              name: svc.name,
              slug: svc.slug,
              description_html: svc.description || '',
              image_url: svc.image_url,
              icon: svc.icon,
              order: svc.order,
              is_active: Boolean(svc.is_active),
              meta_title: svc.meta_title || '',
              meta_description: svc.meta_description || '',
              meta_keywords: svc.meta_keywords || ''
            }}
            onSubmit={action}
            submitLabel="Update Layanan"
          />
        </div>
      </div>
    </div>
  )
}
