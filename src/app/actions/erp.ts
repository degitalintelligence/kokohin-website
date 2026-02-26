'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- CONTRACT ACTIONS ---

export async function createContractFromQuotation(quotationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch quotation data with related info and payment terms
    const { data: qtn, error: qtnError } = await supabase
        .from('erp_quotations')
        .select('*, erp_quotation_items(*, atap:atap_id(name), rangka:rangka_id(name), finishing:finishing_id(name), isian:isian_id(name)), erp_payment_terms(*)')
        .eq('id', quotationId)
        .single()

    if (qtnError || !qtn) throw new Error('Quotation not found')
    if (qtn.status !== 'approved') throw new Error('Quotation must be approved to create contract')

    // 2. Generate contract number (e.g., CTR-20260225-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const ctrNumber = `CTR-${dateStr}-${randomSuffix}`

    // 2.5 Prepare dynamic scope snapshot from quotation items
    const scopeSnapshot = qtn.erp_quotation_items
        ?.map((item: any) => {
            let spec = `- ${item.name} (${item.quantity} ${item.unit})`
            const details = []
            if (item.atap?.name) details.push(`Atap: ${item.atap.name}`)
            if (item.rangka?.name) details.push(`Rangka: ${item.rangka.name}`)
            if (item.isian?.name) details.push(`Isian: ${item.isian.name}`)
            if (item.finishing?.name) details.push(`Finishing: ${item.finishing.name}`)
            
            if (details.length > 0) {
                spec += `\n  Spesifikasi: ${details.join(', ')}`
            }
            return spec
        })
        .join('\n') || 'Pekerjaan sesuai spesifikasi penawaran.'

    // Prepare payment terms JSON from the linked term if available
    const paymentTermsJson = qtn.erp_payment_terms?.terms_json || {
        t1_percent: 50,
        t2_percent: 40,
        t3_percent: 10
    }

    // Fetch default signatory (Project Manager)
    const { data: signatory } = await supabase
        .from('erp_signatories')
        .select('id')
        .eq('name', 'Dedi Setiadi')
        .maybeSingle()

    // 3. Create Contract & Items atomically via RPC
    const { data: contractId, error: rpcError } = await supabase.rpc('create_contract_with_items', {
        p_quotation_id: quotationId,
        p_contract_number: ctrNumber,
        p_total_value: qtn.total_amount,
        p_signatory_id: signatory?.id || null,
        p_scope_snapshot: scopeSnapshot,
        p_attachments: qtn.attachments || [],
        p_payment_terms_json: paymentTermsJson,
        p_items: qtn.erp_quotation_items?.map((item: any) => ({
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type
        })) || []
    })

    if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw new Error(`Gagal membuat kontrak: ${rpcError.message}`)
    }

    // 4. Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'contract',
        entity_id: contractId,
        action_type: 'create',
        new_value: { id: contractId, contract_number: ctrNumber }
    })

    revalidatePath('/admin/erp')
    return { success: true, contractId }
}

// --- INVOICE ACTIONS ---

export async function createInvoiceFromContract(contractId: string, options?: { amount?: number, stageName?: string, percentage?: number }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: ctr, error: ctrError } = await supabase
        .from('erp_contracts')
        .select('*')
        .eq('id', contractId)
        .single()

    if (ctrError || !ctr) throw new Error('Contract not found')

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const invNumber = `INV-${dateStr}-${randomSuffix}`

    const finalAmount = options?.amount || 
        (options?.percentage ? Math.ceil(ctr.total_value * (options.percentage / 100)) : ctr.total_value)

    // Check for duplicate invoice for this stage
    if (options?.stageName) {
        const { data: existingInv } = await supabase
            .from('erp_invoices')
            .select('id')
            .eq('contract_id', contractId)
            .eq('payment_stage', options.stageName)
            .maybeSingle()
        
        if (existingInv) throw new Error(`Invoice untuk termin "${options.stageName}" sudah pernah diterbitkan.`)
    }

    const { data: invoice, error: invError } = await supabase
        .from('erp_invoices')
        .insert({
            contract_id: contractId,
            invoice_number: invNumber,
            total_amount: finalAmount,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            status: 'unpaid',
            attachments: ctr.attachments || [],
            payment_stage: options?.stageName || 'Tagihan Proyek'
        })
        .select()
        .single()

    if (invError) throw invError

    // Create a single invoice item describing the payment stage
    const itemName = options?.stageName ? `Pembayaran: ${options.stageName}` : 'Tagihan Proyek'
    
    await supabase.from('erp_invoice_items').insert({
        invoice_id: invoice.id,
        name: itemName,
        unit: 'lot',
        quantity: 1,
        unit_price: finalAmount,
        subtotal: finalAmount,
        type: 'service'
    })

    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'invoice',
        entity_id: invoice.id,
        action_type: 'create',
        new_value: { ...invoice, stage: options?.stageName }
    })

    revalidatePath('/admin/erp')
    return { success: true, invoiceId: invoice.id }
}

export async function updateContractItems(contractId: string, items: any[], totalAmount: number, metadata?: { signatory_id?: string, client_ktp?: string, client_address?: string, client_email?: string, terms_and_conditions?: string, attachments?: any[] }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch current contract to get lead_id/customer_profile_id
    const { data: currentCtr } = await supabase
        .from('erp_contracts')
        .select('*, erp_quotations(leads(id))')
        .eq('id', contractId)
        .single()

    await supabase.from('erp_contract_items').delete().eq('contract_id', contractId)
    const { error: insertError } = await supabase.from('erp_contract_items').insert(
        items.map(item => ({
            contract_id: contractId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type
        }))
    )
    if (insertError) throw insertError

    const updateData: any = { 
        total_value: totalAmount, 
        updated_at: new Date().toISOString() 
    }
    if (metadata?.signatory_id) updateData.signatory_id = metadata.signatory_id
    if (metadata?.client_ktp) updateData.client_ktp = metadata.client_ktp
    if (metadata?.terms_and_conditions) updateData.terms_and_conditions = metadata.terms_and_conditions
    if (metadata?.attachments) updateData.attachments = metadata.attachments

    // Sync to Customer Profile if exists
    if (currentCtr?.erp_quotations?.leads?.id) {
        await supabase
            .from('erp_customer_profiles')
            .update({
                ktp_number: metadata?.client_ktp,
                address: metadata?.client_address,
                email: metadata?.client_email
            })
            .eq('lead_id', currentCtr.erp_quotations.leads.id)
    }

    await supabase.from('erp_contracts').update(updateData).eq('id', contractId)
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'contract',
        entity_id: contractId,
        action_type: 'update_items',
        new_value: { items, total_value: totalAmount, metadata }
    })

    revalidatePath('/admin/erp')
    return { success: true }
}

export async function updateCustomerProfile(leadId: string, data: { name?: string, ktp_number?: string, address?: string, email?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('erp_customer_profiles')
        .update(data)
        .eq('lead_id', leadId)
    
    if (error) throw error
    return { success: true }
}

export async function updateInvoiceItems(invoiceId: string, items: any[], totalAmount: number, notes?: string, attachments?: any[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    await supabase.from('erp_invoice_items').delete().eq('invoice_id', invoiceId)
    const { error: insertError } = await supabase.from('erp_invoice_items').insert(
        items.map(item => ({
            invoice_id: invoiceId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type
        }))
    )
    if (insertError) throw insertError

    const updateData: any = { total_amount: totalAmount, updated_at: new Date().toISOString() }
    if (notes) updateData.notes = notes
    if (attachments) updateData.attachments = attachments

    await supabase.from('erp_invoices').update(updateData).eq('id', invoiceId)
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'invoice',
        entity_id: invoiceId,
        action_type: 'update_items',
        new_value: { items, total_amount: totalAmount, notes, attachments }
    })

    revalidatePath('/admin/erp')
    return { success: true }
}

// --- PAYMENT ACTIONS ---

export async function recordPayment(invoiceId: string, data: { amount: number, method: string, ref?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: payment, error: payError } = await supabase
        .from('erp_payments')
        .insert({
            invoice_id: invoiceId,
            amount: data.amount,
            payment_method: data.method,
            reference_number: data.ref,
            status: 'completed'
        })
        .select()
        .single()

    if (payError) throw payError

    // Update invoice status based on total payments
    const { data: payments } = await supabase.from('erp_payments').select('amount').eq('invoice_id', invoiceId).eq('status', 'completed')
    const { data: invoice } = await supabase.from('erp_invoices').select('total_amount').eq('id', invoiceId).single()
    
    const totalPaid = (payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
    let newStatus = 'partially_paid'
    if (totalPaid >= Number(invoice?.total_amount)) newStatus = 'paid'

    await supabase.from('erp_invoices').update({ 
        amount_paid: totalPaid,
        status: newStatus,
        updated_at: new Date().toISOString()
    }).eq('id', invoiceId)

    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'payment',
        entity_id: payment.id,
        action_type: 'record',
        new_value: payment
    })

    revalidatePath('/admin/erp')
    return { success: true }
}
