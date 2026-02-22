import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let base = 'https://kokohin.com'
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'company_website')
      .maybeSingle()
    const raw = (data as { value?: string } | null)?.value ?? null
    if (raw) {
      const hasProtocol = /^https?:\/\//i.test(raw)
      const normalized = raw.replace(/\/+$/, '')
      base = hasProtocol ? normalized : `https://${normalized}`
    }
  } catch {
    // ignore and use default base
  }

  const now = new Date()
  const routes = ['/', '/tentang', '/layanan', '/katalog', '/kalkulator', '/galeri', '/kontak', '/kebijakan-privasi']

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }))
}
