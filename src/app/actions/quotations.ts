'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AttachmentPayload {
    name: string
    url: string
    type: string
    created_at: string
}

type BuilderCostSnapshot = Record<string, unknown>

interface QuotationItem {
    name: string
    unit: string
    quantity: number
    unit_price: number
    subtotal: number
    type: string
    builder_costs?: BuilderCostSnapshot[]
    catalog_id?: string | null
    atap_id?: string | null
    rangka_id?: string | null
    finishing_id?: string | null
    isian_id?: string | null
    zone_id?: string | null
    panjang?: number | null
    lebar?: number | null
    unit_qty?: number | null
    markup_percentage?: number
    markup_flat_fee?: number
}

interface Lead {
    id: string
    project_id?: string
    panjang?: number
    lebar?: number
    unit_qty?: number
    total_hpp?: number
    total_selling_price?: number
    original_selling_price?: number
    catalog_id?: string
    zone_id?: string
    attachments?: AttachmentPayload[]
    catalog?: {
        title: string
        base_price_unit?: string
    }
    zone?: {
        markup_percentage?: number
        flat_fee?: number
    }
}

export async function createQuotationForLead(leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch lead data first
    const { data: leadRaw, error: leadError } = await supabase
        .from('leads')
        .select('*, zone:zone_id(*), catalog:catalog_id(*)')
        .eq('id', leadId)
        .single()
    
    if (leadError || !leadRaw) throw new Error('Lead not found')
    const lead = leadRaw as unknown as Lead

    // 2. Check if there's an existing estimation
    const { data: estimation } = await supabase
        .from('estimations')
        .select('id')
        .eq('lead_id', leadId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

    // 3. If estimation exists, use the existing flow
    if (estimation) {
        return createQuotationFromEstimation(estimation.id)
    }

    // 4. If no estimation, create a draft quotation from Lead data
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const qtnNumber = `QTN-${dateStr}-${randomSuffix}`

    const catalogTitle = lead.catalog?.title || 'Paket Pekerjaan'
    const catalogUnitRaw = lead.catalog?.base_price_unit
    const catalogUnit = catalogUnitRaw === 'm2' ? 'm²' : catalogUnitRaw === 'm1' ? 'm¹' : 'unit'

    const totalAmount = lead.original_selling_price || lead.total_selling_price || 0

    const { data: quotation, error: qtnError } = await supabase
        .from('erp_quotations')
        .insert({
            lead_id: leadId,
            project_id: lead.project_id,
            quotation_number: qtnNumber,
            total_amount: totalAmount,
            status: 'draft',
            created_by: user.id,
            valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            panjang: lead.panjang,
            lebar: lead.lebar,
            unit_qty: lead.unit_qty,
            margin_percentage: 30,
            catalog_id: lead.catalog_id,
            zone_id: lead.zone_id,
            total_hpp: lead.total_hpp || 0,
            attachments: lead.attachments || []
        })
        .select()
        .single()

    if (qtnError) {
        console.error('Failed to create quotation:', qtnError)
        throw qtnError
    }

    // 4.5. Create initial quotation item from Lead's Catalog
    const qty = (Number(lead.panjang) * Number(lead.lebar)) || Number(lead.unit_qty) || 1
    
    // Add Zone Markup to total amount if applicable (Internal calculation, not separate line)
    const zone = lead.zone
    const finalTotalAmount = totalAmount
    let markupPercentage = 0
    let markupFlatFee = 0

    if (zone && (Number(zone.markup_percentage) > 0 || Number(zone.flat_fee) > 0)) {
        markupPercentage = Number(zone.markup_percentage || 0)
        markupFlatFee = Number(zone.flat_fee || 0)
        // Note: We DO NOT add markupNominal to finalTotalAmount here 
        // because lead.total_selling_price already includes the zone markup from the calculator.
        // We only extract the values to be stored as metadata in erp_quotation_items.
    }

    const unitPrice = qty > 0 ? Math.ceil(finalTotalAmount / qty) : finalTotalAmount

    const qtnItems: QuotationItem[] = [
        {
            name: catalogTitle,
            unit: catalogUnit,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: finalTotalAmount,
            type: 'catalog',
            // Snapshot for builder
            builder_costs: [], 
            catalog_id: lead.catalog_id,
            zone_id: lead.zone_id,
            panjang: lead.panjang,
            lebar: lead.lebar,
            unit_qty: lead.unit_qty,
            markup_percentage: markupPercentage,
            markup_flat_fee: markupFlatFee
        }
    ]

    const { error: itemError } = await supabase.from('erp_quotation_items').insert(
        qtnItems.map(item => ({ ...item, quotation_id: quotation.id }))
    )
    if (itemError) {
        console.error('Failed to create quotation items from lead:', itemError)
        throw itemError
    }

    // 5. Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: quotation.id,
        action_type: 'create',
        new_value: { ...quotation, items: qtnItems }
    })

    revalidatePath('/admin/erp')
    revalidatePath('/admin/leads')
    return { success: true, quotationId: quotation.id }
}

interface Estimation {
    id: string
    lead_id: string
    project_id?: string
    total_selling_price: number
    margin_percentage: number
    total_hpp: number
    lead?: Lead
}

export async function createQuotationFromEstimation(estimationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch estimation data
    const { data: estRaw, error: estError } = await supabase
        .from('estimations')
        .select('*, lead:lead_id(*, zone:zone_id(*), catalog:catalog_id(*)), project:project_id(*)')
        .eq('id', estimationId)
        .single()

    if (estError || !estRaw) throw new Error('Estimation not found')
    const estimation = estRaw as unknown as Estimation

    // 2. Generate quotation number (e.g., QTN-20260225-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const qtnNumber = `QTN-${dateStr}-${randomSuffix}`

    // 3. Create Quotation with Metadata from Estimation
    const { data: quotation, error: qtnError } = await supabase
        .from('erp_quotations')
        .insert({
            estimation_id: estimationId,
            lead_id: estimation.lead_id,
            project_id: estimation.project_id,
            quotation_number: qtnNumber,
            total_amount: estimation.total_selling_price,
            status: 'draft',
            created_by: user.id,
            valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days validity
            // Builder metadata snapshots
            panjang: estimation.lead?.panjang,
            lebar: estimation.lead?.lebar,
            unit_qty: estimation.lead?.unit_qty,
            margin_percentage: estimation.margin_percentage,
            catalog_id: estimation.lead?.catalog_id,
            zone_id: estimation.lead?.zone_id,
            total_hpp: estimation.total_hpp
        })
        .select()
        .single()

    if (qtnError) {
        console.error('Failed to create quotation from estimation:', qtnError)
        throw qtnError
    }

    // 3.5. Create initial quotation items (Catalog + Zone Markup)
    // Instead of copying HPP materials, we use the Catalog Package pattern
    const leadData = estimation.lead
    const zone = leadData?.zone
    const initialTotalAmount = Number(estimation.total_selling_price)
    
    const catalogUnitRaw = leadData?.catalog?.base_price_unit
    const catalogUnit = catalogUnitRaw === 'm2' ? 'm²' : catalogUnitRaw === 'm1' ? 'm¹' : 'unit'

    const qty = (Number(leadData?.panjang) * Number(leadData?.lebar)) || Number(leadData?.unit_qty) || 1
    
    // Add Zone Markup to total amount if applicable (Internal calculation, not separate line)
    const finalTotalAmount = initialTotalAmount
    let markupPercentage = 0
    let markupFlatFee = 0

    if (zone && (Number(zone.markup_percentage) > 0 || Number(zone.flat_fee) > 0)) {
        markupPercentage = Number(zone.markup_percentage || 0)
        markupFlatFee = Number(zone.flat_fee || 0)
        // Note: We DO NOT add markupNominal to finalTotalAmount here 
        // because estimation.total_selling_price already includes the zone markup from the lead calculator.
    }

    const unitPrice = qty > 0 ? Math.ceil(finalTotalAmount / qty) : finalTotalAmount

    const qtnItems: QuotationItem[] = [
        {
            name: leadData?.catalog?.title || 'Paket Pekerjaan',
            unit: catalogUnit,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: finalTotalAmount,
            type: 'catalog',
            // Snapshot for builder
            builder_costs: [], // Will be loaded from catalog in builder
            catalog_id: leadData?.catalog_id,
            zone_id: leadData?.zone_id,
            panjang: leadData?.panjang,
            lebar: leadData?.lebar,
            unit_qty: leadData?.unit_qty,
            markup_percentage: markupPercentage,
            markup_flat_fee: markupFlatFee
        }
    ]

    const { error: itemError } = await supabase.from('erp_quotation_items').insert(
        qtnItems.map(item => ({ ...item, quotation_id: quotation.id }))
    )
    if (itemError) {
        console.error('Failed to create quotation items from estimation:', itemError)
        throw itemError
    }

    // 4. Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: quotation.id,
        action_type: 'create',
        new_value: { ...quotation, items: qtnItems }
    })

    revalidatePath('/admin/leads')
    revalidatePath('/admin/erp')
    return { success: true, quotationId: quotation.id }
}

export async function updateQuotationStatus(quotationId: string, newStatus: string, notes?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: oldQtn } = await supabase.from('erp_quotations').select('*').eq('id', quotationId).single()

    const { error } = await supabase
        .from('erp_quotations')
        .update({ status: newStatus, notes, updated_at: new Date().toISOString() })
        .eq('id', quotationId)

    if (error) throw error

    // Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: quotationId,
        action_type: 'update_status',
        old_value: { status: oldQtn?.status },
        new_value: { status: newStatus, notes }
    })

    revalidatePath('/admin/leads')
    return { success: true }
}

export async function updateQuotationItems(quotationId: string, items: QuotationItem[], totalAmount: number, paymentTermId?: string, notes?: string, attachments?: AttachmentPayload[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Delete old items
    await supabase.from('erp_quotation_items').delete().eq('quotation_id', quotationId)

    // 2. Insert new items with hierarchical builder support
    const { error: insertError } = await supabase.from('erp_quotation_items').insert(
        items.map((item, idx) => ({
            quotation_id: quotationId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type,
            // Hierarchical Builder Columns
            builder_costs: item.builder_costs || [],
            catalog_id: item.catalog_id || null,
            atap_id: item.atap_id || null,
            rangka_id: item.rangka_id || null,
            finishing_id: item.finishing_id || null,
            isian_id: item.isian_id || null,
            zone_id: item.zone_id || null,
            panjang: item.panjang || null,
            lebar: item.lebar || null,
            unit_qty: item.unit_qty || null,
            markup_percentage: item.markup_percentage || 0,
            markup_flat_fee: idx === 0 ? (item.markup_flat_fee || 0) : 0 // Static markup only for Line #1
        }))
    )

    if (insertError) throw insertError

    // 3. Update quotation total and payment terms
    interface QuotationUpdateData {
        total_amount: number
        updated_at: string
        payment_term_id?: string
        notes?: string
        attachments?: AttachmentPayload[]
    }

    const updateData: QuotationUpdateData = { 
        total_amount: totalAmount, 
        updated_at: new Date().toISOString() 
    }
    if (paymentTermId) updateData.payment_term_id = paymentTermId
    if (notes) updateData.notes = notes
    if (attachments) updateData.attachments = attachments

    const { error: qtnError } = await supabase
        .from('erp_quotations')
        .update(updateData)
        .eq('id', quotationId)

    if (qtnError) throw qtnError

    // 4. Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: quotationId,
        action_type: 'update_items',
        new_value: { items, total_amount: totalAmount, payment_term_id: paymentTermId, notes, attachments }
    })

    revalidatePath('/admin/erp')
    return { success: true }
}

export async function updateQuotationBuilder(
    quotationId: string,
    data: {
        panjang?: number
        lebar?: number
        unit_qty?: number
        margin_percentage: number
        total_hpp: number
        total_amount: number
        items: QuotationItem[]
        custom_unit_price?: number
        standard_unit_price?: number
        zone_id?: string
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch current data for audit trail
    const { data: currentQtn } = await supabase
        .from('erp_quotations')
        .select('total_amount, catalog_id, zone_id, catalogs(base_price_per_m2)')
        .eq('id', quotationId)
        .single()

    // 2. Update Quotation Metadata
    const { error: qtnError } = await supabase
        .from('erp_quotations')
        .update({
            panjang: data.panjang,
            lebar: data.lebar,
            unit_qty: data.unit_qty,
            margin_percentage: data.margin_percentage,
            total_hpp: data.total_hpp,
            total_amount: data.total_amount,
            zone_id: data.zone_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', quotationId)

    if (qtnError) throw qtnError

    // 3. Replace Items
    await supabase.from('erp_quotation_items').delete().eq('quotation_id', quotationId)
    const { error: itemError } = await supabase.from('erp_quotation_items').insert(
        data.items.map(item => ({
            quotation_id: quotationId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type
        }))
    )

    if (itemError) throw itemError

    // 4. Log Audit Trail with Price Comparison & Zoning
    const standardPrice = data.standard_unit_price || (currentQtn?.catalogs as unknown as { base_price_per_m2?: number })?.base_price_per_m2 || 0
    const deviance = standardPrice > 0 ? ((data.custom_unit_price || 0) - standardPrice) / standardPrice * 100 : 0

    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: quotationId,
        action_type: 'update_builder_custom_price',
        old_value: {
            total_amount: currentQtn?.total_amount,
            standard_unit_price: standardPrice,
            zone_id: currentQtn?.zone_id
        },
        new_value: {
            total_amount: data.total_amount,
            custom_unit_price: data.custom_unit_price,
            price_deviance_percentage: Math.round(deviance * 100) / 100,
            panjang: data.panjang,
            lebar: data.lebar,
            zone_id: data.zone_id
        }
    })

    revalidatePath('/admin/erp')
    return { success: true }
}
