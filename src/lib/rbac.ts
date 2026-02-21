export type AppRole = 'super_admin' | 'admin_sales' | 'admin_proyek'

const SUPER_ADMIN_EMAILS: string[] = ['dedi.setiadi92@gmail.com']

export const ALLOWED_MATERIALS_ROLES: AppRole[] = ['super_admin']
export const ALLOWED_ADMIN_ROLES: AppRole[] = ['super_admin', 'admin_sales', 'admin_proyek']

export function isRoleAllowed(
  role: string | null | undefined,
  allowed: AppRole[],
  userEmail?: string | null
): boolean {
  if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return true
  }
  if (!role) return false
  return allowed.includes(role as AppRole)
}
