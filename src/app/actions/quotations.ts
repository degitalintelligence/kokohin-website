'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildCostingItems, type CatalogCosting, type HppComponent } from '@/lib/utils/costing'

interface AttachmentPayload {
    name: string
    url: string
    type: string
    created_at: string
}

type BuilderCostSnapshot = Record<string, unknown>

interface QuotationItem {
    id?: string
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

    const { data: insertedLeadItems, error: itemError } = await supabase.from('erp_quotation_items').insert(
        qtnItems.map(item => ({ ...item, quotation_id: quotation.id }))
    ).select('id, quotation_id, name, builder_costs, catalog_id, panjang, lebar, unit_qty, type')
    if (itemError) {
        console.error('Failed to create quotation items from lead:', itemError)
        throw itemError
    }
    await syncQuotationItemCostSnapshots(
        supabase,
        quotation.id,
        (insertedLeadItems ?? []) as InsertedQuotationItemRow[],
    )

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

interface RevisionItemRow {
    name: string
    unit: string
    quantity: number
    unit_price: number
    subtotal: number
    type: string
    builder_costs: BuilderCostSnapshot[] | null
    catalog_id: string | null
    atap_id: string | null
    rangka_id: string | null
    finishing_id: string | null
    isian_id: string | null
    zone_id: string | null
    panjang: number | null
    lebar: number | null
    unit_qty: number | null
    markup_percentage: number | null
    markup_flat_fee: number | null
}

interface RevisionTermRow {
    term_name: string
    percentage: number
    amount_due: number
    is_default: boolean
    is_active: boolean
}

type InsertedQuotationItemRow = {
    id: string
    quotation_id: string
    name: string
    builder_costs: BuilderCostSnapshot[] | null
    catalog_id?: string | null
    panjang?: number | null
    lebar?: number | null
    unit_qty?: number | null
    type?: string
}

const toNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const normalizeSegment = (value: unknown): string => {
    const text = String(value ?? '').toLowerCase().trim()
    if (!text) return 'lainnya'
    return text === 'frame' ? 'rangka' : text
}

const isMissingRelationError = (error: unknown): boolean => {
    const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase()
    return message.includes('does not exist') || message.includes('42p01')
}

type BaselineSnapshotRow = {
    component_key: string
    component_name: string
    segment: string
    source_type: string
    material_name_snapshot: string | null
    unit_snapshot: string | null
    qty_snapshot: number
    hpp_snapshot: number
    subtotal_snapshot: number
    metadata: Record<string, unknown>
}

type SyncSnapshotOptions = {
    legacyItemIdsByIndex?: Array<string | null>
    legacyBaselineByItemId?: Map<string, BaselineSnapshotRow[]>
}

async function loadLegacyBaselineByItemIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    itemIds: string[],
): Promise<Map<string, BaselineSnapshotRow[]>> {
    const map = new Map<string, BaselineSnapshotRow[]>()
    if (itemIds.length === 0) return map
    const { data, error } = await supabase
        .from('erp_quotation_item_baseline_costs')
        .select('quotation_item_id, component_key, component_name, segment, source_type, material_name_snapshot, unit_snapshot, qty_snapshot, hpp_snapshot, subtotal_snapshot, metadata')
        .in('quotation_item_id', itemIds)
    if (error && isMissingRelationError(error)) return map
    if (error) throw error
    ;(data ?? []).forEach((row) => {
        const itemId = String((row as { quotation_item_id?: string }).quotation_item_id ?? '')
        if (!itemId) return
        const current = map.get(itemId) ?? []
        current.push({
            component_key: String((row as { component_key?: string }).component_key ?? ''),
            component_name: String((row as { component_name?: string }).component_name ?? ''),
            segment: normalizeSegment((row as { segment?: string }).segment ?? 'lainnya'),
            source_type: String((row as { source_type?: string }).source_type ?? 'catalog'),
            material_name_snapshot: ((row as { material_name_snapshot?: string | null }).material_name_snapshot ?? null),
            unit_snapshot: ((row as { unit_snapshot?: string | null }).unit_snapshot ?? null),
            qty_snapshot: toNumber((row as { qty_snapshot?: number }).qty_snapshot),
            hpp_snapshot: toNumber((row as { hpp_snapshot?: number }).hpp_snapshot),
            subtotal_snapshot: toNumber((row as { subtotal_snapshot?: number }).subtotal_snapshot),
            metadata: ((row as { metadata?: Record<string, unknown> }).metadata ?? {}),
        })
        map.set(itemId, current)
    })
    return map
}

async function buildCatalogBaselineRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    item: InsertedQuotationItemRow,
): Promise<BaselineSnapshotRow[]> {
    if (!item.catalog_id) return []
    const { data: catalogRaw, error: catalogError } = await supabase
        .from('catalogs')
        .select('id, title, base_price_per_m2, base_price_unit, labor_cost, transport_cost, margin_percentage, hpp_per_unit, atap_id, rangka_id, finishing_id, isian_id, use_std_calculation, std_calculation, atap:atap_id(name, variant_name, unit, base_price_per_unit, length_per_unit), rangka:rangka_id(name, variant_name, unit, base_price_per_unit, length_per_unit), finishing:finishing_id(name, variant_name, unit, base_price_per_unit, length_per_unit), isian:isian_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
        .eq('id', item.catalog_id)
        .maybeSingle()
    if (catalogError) return []
    if (!catalogRaw) return []

    let hppComponentsRaw: unknown[] = []
    const primaryResult = await supabase
        .from('catalog_hpp_components')
        .select('id, material_id, quantity, section, calculation_mode, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
        .eq('catalog_id', item.catalog_id)
    if (primaryResult.error) {
        const fallbackResult = await supabase
            .from('catalog_hpp_components')
            .select('id, material_id, quantity, section, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
            .eq('catalog_id', item.catalog_id)
        hppComponentsRaw = (fallbackResult.data ?? []) as unknown[]
    } else {
        hppComponentsRaw = (primaryResult.data ?? []) as unknown[]
    }

    const baselineItems = buildCostingItems(
        catalogRaw as unknown as CatalogCosting,
        {
            panjang: toNumber(item.panjang),
            lebar: toNumber(item.lebar),
            unitQty: Math.max(1, toNumber(item.unit_qty)),
        },
        item.type === 'manual' && !item.catalog_id,
        hppComponentsRaw as HppComponent[],
    )

    return baselineItems
        .filter((entry) => !String(entry.id || '').startsWith('addon-') && !String(entry.id || '').startsWith('override-'))
        .map((entry) => ({
            component_key: String(entry.id ?? ''),
            component_name: String(entry.name ?? 'Komponen'),
            segment: normalizeSegment(entry.type),
            source_type: 'catalog',
            material_name_snapshot: String(entry.name ?? ''),
            unit_snapshot: String(entry.unit ?? 'unit'),
            qty_snapshot: toNumber(entry.qtyCharged),
            hpp_snapshot: toNumber(entry.hpp),
            subtotal_snapshot: toNumber(entry.subtotal),
            metadata: { source: 'catalog_snapshot' },
        }))
}

async function syncQuotationItemCostSnapshots(
    supabase: Awaited<ReturnType<typeof createClient>>,
    quotationId: string,
    insertedItems: InsertedQuotationItemRow[],
    options?: SyncSnapshotOptions,
) {
    const { error: baselineDeleteError } = await supabase
        .from('erp_quotation_item_baseline_costs')
        .delete()
        .eq('quotation_id', quotationId)
    if (baselineDeleteError && isMissingRelationError(baselineDeleteError)) return
    if (baselineDeleteError) throw baselineDeleteError

    const { error: actualDeleteError } = await supabase
        .from('erp_quotation_item_costs')
        .delete()
        .eq('quotation_id', quotationId)
    if (actualDeleteError && isMissingRelationError(actualDeleteError)) return
    if (actualDeleteError) throw actualDeleteError

    const baselineRows: Array<Record<string, unknown>> = []
    const actualRows: Array<Record<string, unknown>> = []

    for (let index = 0; index < insertedItems.length; index += 1) {
        const item = insertedItems[index]
        const costs = Array.isArray(item.builder_costs) ? item.builder_costs : []
        const legacyId = options?.legacyItemIdsByIndex?.[index] ?? null
        const legacyBaselineRows = legacyId ? (options?.legacyBaselineByItemId?.get(legacyId) ?? []) : []
        const baselineFromCatalog = legacyBaselineRows.length > 0
            ? legacyBaselineRows
            : await buildCatalogBaselineRows(supabase, item)

        baselineFromCatalog.forEach((row) => {
            baselineRows.push({
                quotation_id: quotationId,
                quotation_item_id: item.id,
                component_key: row.component_key || `${item.id}-baseline`,
                component_name: row.component_name || 'Komponen',
                segment: normalizeSegment(row.segment),
                source_type: row.source_type || 'catalog',
                material_name_snapshot: row.material_name_snapshot,
                unit_snapshot: row.unit_snapshot,
                qty_snapshot: toNumber(row.qty_snapshot),
                hpp_snapshot: toNumber(row.hpp_snapshot),
                subtotal_snapshot: toNumber(row.subtotal_snapshot),
                metadata: row.metadata ?? {},
            })
        })

        costs.forEach((rawCost, idx) => {
            const cost = (typeof rawCost === 'object' && rawCost !== null)
                ? (rawCost as Record<string, unknown>)
                : {}
            const idRaw = String(cost.id ?? '').trim()
            const isAddon = idRaw.startsWith('addon-')
            const isOverride = idRaw.startsWith('override-')
            const sourceType = isAddon ? 'addon' : isOverride ? 'override' : 'catalog'
            const componentKey = idRaw || `${item.id}-line-${idx + 1}`
            const componentName = String(cost.name ?? `Komponen ${idx + 1}`)
            const segment = normalizeSegment(cost.type)
            const unit = String(cost.unit ?? 'unit')
            const hpp = toNumber(cost.hpp)
            const qtyFinal = toNumber(cost.qtyCharged)
            const qtyBase = toNumber(
                isAddon
                    ? (cost.addon_base_qty ?? cost.qtyNeeded)
                    : isOverride
                        ? (cost.override_base_qty ?? cost.qtyNeeded)
                        : cost.qtyNeeded,
            )
            const subtotal = toNumber(cost.subtotal)
            const mode = isAddon
                ? (String(cost.addon_mode ?? '').toLowerCase() === 'fixed' ? 'fixed' : 'variable')
                : isOverride
                    ? (String(cost.override_mode ?? '').toLowerCase() === 'fixed' ? 'fixed' : 'variable')
                    : null
            const materialName = String(
                cost.material_name_snapshot ??
                cost.name ??
                item.name ??
                '',
            )
            const materialId = typeof cost.addon_material_id === 'string'
                ? cost.addon_material_id
                : typeof cost.override_material_id === 'string'
                    ? cost.override_material_id
                    : null
            actualRows.push({
                quotation_id: quotationId,
                quotation_item_id: item.id,
                line_no: idx + 1,
                component_key: componentKey,
                component_name: componentName,
                segment,
                source_type: sourceType,
                mode,
                material_id: materialId,
                material_name_snapshot: materialName,
                unit_snapshot: unit,
                qty_base: qtyBase,
                qty_final: qtyFinal,
                hpp_snapshot: hpp,
                subtotal_final: subtotal,
                is_excluded: false,
                metadata: cost,
            })
        })
    }

    if (baselineRows.length > 0) {
        const { error } = await supabase
            .from('erp_quotation_item_baseline_costs')
            .insert(baselineRows)
        if (error && isMissingRelationError(error)) return
        if (error) throw error
    }

    if (actualRows.length > 0) {
        const { error } = await supabase
            .from('erp_quotation_item_costs')
            .insert(actualRows)
        if (error && isMissingRelationError(error)) return
        if (error) throw error
    }
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

    const { data: insertedEstimationItems, error: itemError } = await supabase.from('erp_quotation_items').insert(
        qtnItems.map(item => ({ ...item, quotation_id: quotation.id }))
    ).select('id, quotation_id, name, builder_costs, catalog_id, panjang, lebar, unit_qty, type')
    if (itemError) {
        console.error('Failed to create quotation items from estimation:', itemError)
        throw itemError
    }
    await syncQuotationItemCostSnapshots(
        supabase,
        quotation.id,
        (insertedEstimationItems ?? []) as InsertedQuotationItemRow[],
    )

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

export async function createQuotationRevision(quotationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch original quotation with items and payment terms
    const { data: qtn, error: qtnError } = await supabase
        .from('erp_quotations')
        .select('*, erp_quotation_items(*), erp_payment_terms(*)')
        .eq('id', quotationId)
        .single()

    if (qtnError || !qtn) throw new Error('Original quotation not found')
    
    // 1.5. Check if contract exists for this quotation
    const { data: contract } = await supabase
        .from('erp_contracts')
        .select('id')
        .eq('quotation_id', quotationId)
        .maybeSingle()

    if (contract) {
        throw new Error('Tidak bisa membuat revisi karena kontrak sudah diterbitkan untuk penawaran ini.')
    }

    // Only approved quotations can be revised (rule)
    if (qtn.status !== 'approved') {
        throw new Error('Hanya penawaran yang sudah disetujui yang dapat direvisi.')
    }

    // 2. Prepare new version data
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newVersion = (qtn.version || 1) + 1
    const newQtnNumber = `${qtn.quotation_number.split('-V')[0]}-V${newVersion}-${randomSuffix}`

    // 3. Create new quotation record
    const { data: revision, error: revisionError } = await supabase
        .from('erp_quotations')
        .insert({
            estimation_id: qtn.estimation_id,
            lead_id: qtn.lead_id,
            project_id: qtn.project_id,
            quotation_number: newQtnNumber,
            total_amount: qtn.total_amount,
            status: 'draft', // New version starts as draft
            created_by: user.id,
            valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            notes: qtn.notes,
            attachments: qtn.attachments,
            // Builder metadata
            panjang: qtn.panjang,
            lebar: qtn.lebar,
            unit_qty: qtn.unit_qty,
            margin_percentage: qtn.margin_percentage,
            catalog_id: qtn.catalog_id,
            zone_id: qtn.zone_id,
            total_hpp: qtn.total_hpp,
            // Versioning
            version: newVersion,
            parent_id: qtn.id
        })
        .select()
        .single()

    if (revisionError || !revision) throw revisionError

    // 4. Copy items to the new quotation
    const originalItems = (qtn.erp_quotation_items || []) as RevisionItemRow[]
    if (originalItems.length > 0) {
        const { data: insertedRevisionItems, error: itemsError } = await supabase.from('erp_quotation_items').insert(
            originalItems.map((item) => ({
                quotation_id: revision.id,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
                type: item.type,
                builder_costs: item.builder_costs,
                catalog_id: item.catalog_id,
                atap_id: item.atap_id,
                rangka_id: item.rangka_id,
                finishing_id: item.finishing_id,
                isian_id: item.isian_id,
                zone_id: item.zone_id,
                panjang: item.panjang,
                lebar: item.lebar,
                unit_qty: item.unit_qty,
                markup_percentage: item.markup_percentage,
                markup_flat_fee: item.markup_flat_fee
            }))
        ).select('id, quotation_id, name, builder_costs, catalog_id, panjang, lebar, unit_qty, type')
        if (itemsError) throw itemsError
        await syncQuotationItemCostSnapshots(
            supabase,
            revision.id,
            (insertedRevisionItems ?? []) as InsertedQuotationItemRow[],
        )
    }

    // 5. Copy payment terms if applicable
    // Note: Payment terms in this schema seem to be linked to estimation_id or quotation_id
    // If they are linked to erp_quotations, we should copy them.
    // Based on erp_business_flow.sql, erp_payment_terms are linked to quotation_id.
    const originalTerms = (qtn.erp_payment_terms || []) as RevisionTermRow[]
    if (originalTerms.length > 0) {
        const { error: termsError } = await supabase.from('erp_payment_terms').insert(
            originalTerms.map((term) => ({
                quotation_id: revision.id,
                term_name: term.term_name,
                percentage: term.percentage,
                amount_due: term.amount_due,
                is_default: term.is_default,
                is_active: term.is_active
            }))
        )
        if (termsError) throw termsError
    }

    // 6. Log Audit Trail
    await supabase.from('erp_audit_trail').insert({
        user_id: user.id,
        entity_type: 'quotation',
        entity_id: revision.id,
        action_type: 'create_revision',
        new_value: { 
            original_id: qtn.id, 
            version: newVersion,
            quotation_number: newQtnNumber
        }
    })

    revalidatePath('/admin/erp')
    revalidatePath(`/admin/quotes/${revision.id}/edit`)
    
    return { success: true, quotationId: revision.id }
}

export async function updateQuotationItems(quotationId: string, items: QuotationItem[], totalAmount: number, paymentTermId?: string, notes?: string, attachments?: AttachmentPayload[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const legacyItemIdsByIndex = items.map((item) => (item.id ? item.id : null))
    const legacyBaselineByItemId = await loadLegacyBaselineByItemIds(
        supabase,
        legacyItemIdsByIndex.filter((id): id is string => typeof id === 'string' && id.length > 0),
    )

    // 1. Delete old items
    await supabase.from('erp_quotation_items').delete().eq('quotation_id', quotationId)

    // 2. Insert new items with hierarchical builder support
    const { data: insertedItems, error: insertError } = await supabase.from('erp_quotation_items').insert(
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
    ).select('id, quotation_id, name, builder_costs, catalog_id, panjang, lebar, unit_qty, type')

    if (insertError) throw insertError
    await syncQuotationItemCostSnapshots(
        supabase,
        quotationId,
        (insertedItems ?? []) as InsertedQuotationItemRow[],
        {
            legacyItemIdsByIndex,
            legacyBaselineByItemId,
        },
    )

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

    const legacyItemIdsByIndex = data.items.map((item) => (item.id ? item.id : null))
    const legacyBaselineByItemId = await loadLegacyBaselineByItemIds(
        supabase,
        legacyItemIdsByIndex.filter((id): id is string => typeof id === 'string' && id.length > 0),
    )

    // 3. Replace Items
    await supabase.from('erp_quotation_items').delete().eq('quotation_id', quotationId)
    const { data: insertedBuilderItems, error: itemError } = await supabase.from('erp_quotation_items').insert(
        data.items.map(item => ({
            quotation_id: quotationId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            type: item.type,
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
            markup_flat_fee: item.markup_flat_fee || 0
        }))
    ).select('id, quotation_id, name, builder_costs, catalog_id, panjang, lebar, unit_qty, type')

    if (itemError) throw itemError
    await syncQuotationItemCostSnapshots(
        supabase,
        quotationId,
        (insertedBuilderItems ?? []) as InsertedQuotationItemRow[],
        {
            legacyItemIdsByIndex,
            legacyBaselineByItemId,
        },
    )

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
