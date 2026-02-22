import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceRole
    ? createSupabaseAdminClient(supabaseUrl, serviceRole)
    : await createClient()

  const items = [
    {
      name: 'Kanopi Baja Ringan',
      slug: 'kanopi-baja-ringan',
      short_desc: 'Rangka galvalum kuat, cocok untuk carport dan teras.',
      description: '<p>Kanopi berbahan rangka baja ringan (galvalum) dengan pilihan material penutup yang variatif.</p>',
      icon: 'Hammer',
      image_url: null,
      order: 1
    },
    {
      name: 'Kanopi Polycarbonate',
      slug: 'kanopi-polycarbonate',
      short_desc: 'Material ringan, tahan cuaca, transmisi cahaya baik.',
      description: '<p>Atap polycarbonate dengan opsi solid atau twinwall.</p>',
      icon: 'CloudSun',
      image_url: null,
      order: 2
    },
    {
      name: 'Kanopi Kaca Tempered',
      slug: 'kanopi-kaca-tempered',
      short_desc: 'Tampilan mewah dengan kaca tempered tebal.',
      description: '<p>Solusi elegan dengan kaca tempered, cocok untuk fasad modern.</p>',
      icon: 'Warehouse',
      image_url: null,
      order: 3
    },
    {
      name: 'Pergola Minimalis',
      slug: 'pergola-minimalis',
      short_desc: 'Struktur aksen outdoor untuk taman atau teras.',
      description: '<p>Pergola desain minimalis untuk mempercantik area outdoor.</p>',
      icon: 'Warehouse',
      image_url: null,
      order: 4
    },
    {
      name: 'Kanopi Spandek',
      slug: 'kanopi-spandek',
      short_desc: 'Tahan lama, perawatan rendah, pemasangan cepat.',
      description: '<p>Atap spandek dengan berbagai pilihan warna dan ketebalan.</p>',
      icon: 'ShieldCheck',
      image_url: null,
      order: 5
    }
  ]

  const { error } = await supabase.from('services').upsert(items, { onConflict: 'slug' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: items.length })
}
