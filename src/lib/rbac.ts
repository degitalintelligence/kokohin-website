export type AppRole = 'super_admin' | 'admin_sales' | 'admin_proyek'

function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

export const ALLOWED_MATERIALS_ROLES: AppRole[] = ['super_admin']
export const ALLOWED_ADMIN_ROLES: AppRole[] = ['super_admin', 'admin_sales', 'admin_proyek']

export function isRoleAllowed(
  role: string | null | undefined,
  allowed: AppRole[],
  userEmail?: string | null
): boolean {
  const superAdmins = getSuperAdminEmails()
  if (userEmail && superAdmins.includes(userEmail.toLowerCase())) {
    return true
  }
  if (!role) return false
  return allowed.includes(role as AppRole)
}
