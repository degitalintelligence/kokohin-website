'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import type { AppRole } from '@/lib/rbac'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )
}

export async function ensureCurrentUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    return
  }

  let serviceClient
  try {
    serviceClient = await createServiceClient()
  } catch {
    return
  }

  const email = user.email ? normalizeEmail(user.email) : ''
  if (!email) {
    return
  }

  const fullName =
    (user.user_metadata && (user.user_metadata as { full_name?: string }).full_name) ||
    null

  await serviceClient
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      full_name: fullName,
      role: 'admin_proyek',
    })
}

export async function createAdminUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/admin/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const currentRole = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(currentRole, ALLOWED_MATERIALS_ROLES, user.email)) {
    return redirect('/admin')
  }

  const rawEmail = String(formData.get('email') ?? '')
  const rawFullName = String(formData.get('full_name') ?? '')
  const rawPassword = String(formData.get('password') ?? '')
  const rawRole = String(formData.get('role') ?? '')

  const email = normalizeEmail(rawEmail)
  const fullName = rawFullName.trim() || null
  const password = rawPassword.trim()
  let role: AppRole = 'admin_proyek'
  if (rawRole === 'super_admin' || rawRole === 'admin_sales' || rawRole === 'admin_proyek') {
    role = rawRole
  }

  if (!email || !password) {
    return redirect('/admin/users?error=Email%20dan%20password%20wajib%20diisi')
  }

  let serviceClient
  try {
    serviceClient = await createServiceClient()
  } catch {
    return redirect('/admin/users?error=Service%20role%20key%20belum%20dikonfigurasi')
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })

  let userId: string | null = created?.user?.id ?? null
  let existingUsed = false

  if (createError || !userId) {
    const { data: usersResponse, error: listError } = await serviceClient.auth.admin.listUsers()

    const existingUser =
      usersResponse?.users?.find(
        (u: { email?: string | null }) => (u.email ?? '').toLowerCase() === email
      ) ?? null

    if (!existingUser) {
      const message = encodeURIComponent(
        createError?.message ?? listError?.message ?? 'Gagal membuat user'
      )
      return redirect(`/admin/users?error=${message}`)
    }

    userId = (existingUser as { id: string }).id
    existingUsed = true
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role,
    })

  if (profileError) {
    const message = encodeURIComponent(profileError.message)
    return redirect(`/admin/users?error=User%20berhasil%20dibuat,%20tapi%20profil%20gagal:%20${message}`)
  }

  revalidatePath('/admin/users')
  if (existingUsed) {
    return redirect('/admin/users?success=User%20sudah%20terdaftar,%20profil%20berhasil%20disinkronkan')
  }
  return redirect('/admin/users?success=User%20berhasil%20dibuat')
}

export async function updateUserRole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/admin/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const currentRole = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(currentRole, ALLOWED_MATERIALS_ROLES, user.email)) {
    return redirect('/admin')
  }

  const targetId = String(formData.get('id') ?? '')
  const rawRole = String(formData.get('role') ?? '')

  if (!targetId) {
    return redirect('/admin/users?error=ID%20user%20tidak%20valid')
  }

  let role: AppRole | null = null
  if (rawRole === 'super_admin' || rawRole === 'admin_sales' || rawRole === 'admin_proyek') {
    role = rawRole
  }

  if (!role) {
    return redirect('/admin/users?error=Role%20tidak%20valid')
  }

  if (targetId === user.id && role !== currentRole) {
    return redirect('/admin/users?error=Tidak%20dapat%20mengubah%20role%20sendiri')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetId)

  if (error) {
    const message = encodeURIComponent(error.message)
    return redirect(`/admin/users?error=Gagal%20mengupdate%20role:%20${message}`)
  }

  revalidatePath('/admin/users')
  return redirect('/admin/users?success=Role%20berhasil%20diperbarui')
}
