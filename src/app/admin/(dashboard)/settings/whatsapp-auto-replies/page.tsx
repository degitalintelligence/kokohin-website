import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsAppAutoRepliesClient from '@/components/admin/WhatsAppAutoRepliesClient'
import { getAutoReplyTemplatesAction } from '@/app/actions/whatsapp'
import { isRoleAllowed, ALLOWED_MATERIALS_ROLES } from '@/lib/rbac'

export default async function WhatsAppAutoRepliesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const bypass = await isDevBypass()
    if (!user && !bypass) redirect('/admin/login')
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle()
        const role = (profile as { role?: string } | null)?.role ?? null
        if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, (profile as { email?: string } | null)?.email)) {
            redirect('/admin')
        }
    }

    const result = await getAutoReplyTemplatesAction()
    const templates = result.success ? result.templates ?? [] : []

    return (
        <div className="flex-1 bg-gray-50/50 min-h-screen overflow-y-auto">
            <WhatsAppAutoRepliesClient initialTemplates={templates} />
        </div>
    )
}

