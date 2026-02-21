import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../page.module.css'
import { createAdminUser, updateUserRole, ensureCurrentUserProfile, createServiceClient } from '@/app/actions/users'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import type { AppRole } from '@/lib/rbac'

type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  role: AppRole
  created_at: string
}

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin_sales', label: 'Admin Sales' },
  { value: 'admin_proyek', label: 'Admin Proyek' },
]

function formatDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success: successMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  let currentRole: string | null = null
  let userEmail: string | null = null
  if (user) {
    userEmail = user.email ?? null
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    currentRole = (profile as { role?: string } | null)?.role ?? null
  }

  if (!bypass && !isRoleAllowed(currentRole, ALLOWED_MATERIALS_ROLES, userEmail)) {
    redirect('/admin')
  }

  await ensureCurrentUserProfile()

  let profiles: ProfileRow[] | null = null
  let fetchError: unknown = null

  try {
    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: true })
    profiles = (data || []) as ProfileRow[]
    fetchError = error
  } catch {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: true })
    profiles = (data || []) as ProfileRow[]
    fetchError = error
  }

  if (fetchError) {
    const error = fetchError as { message?: string; details?: string; hint?: string; code?: string }
    console.error('Error fetching profiles:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
  }

  const users = profiles || []

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Manajemen User</h1>
          <p className={styles.sub}>Tambah dan atur role admin aplikasi</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-100 text-sm">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 border border-green-100 text-sm">
          {decodeURIComponent(successMsg)}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tambah User Baru</h2>
        </div>
        <form action={createAdminUser} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
            <input
              type="text"
              name="full_name"
              className="w-full px-4 py-2 border rounded-md text-sm"
              placeholder="Nama admin"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-2 border rounded-md text-sm"
              placeholder="admin@kokohin.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              className="w-full px-4 py-2 border rounded-md text-sm"
              placeholder="Minimal 6 karakter"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              className="w-full px-4 py-2 border rounded-md text-sm"
              defaultValue="admin_proyek"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end mt-2">
            <button type="submit" className="btn btn-primary">
              Buat User
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Daftar User ({users.length})
          </h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={styles.bold}>{u.email}</td>
                  <td>{u.full_name || '-'}</td>
                  <td>
                    <span className={styles.badge}>
                      {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="px-2 py-1 border rounded-md text-xs"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-outline-dark btn-sm">
                        Simpan
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    Belum ada user terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
