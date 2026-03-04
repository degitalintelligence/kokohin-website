import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { updateCustomerProfile } from '@/app/actions/erp'
import type { Attachment, CustomerProfile, LeadData, PaymentTerm, Zone } from '../types'

interface UseErpMetadataParams {
  entityId: string
  entityType: 'quotation' | 'contract' | 'invoice'
  customerPhone?: string
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
}

export function useErpMetadata({
  entityId,
  entityType,
  customerPhone,
  setAttachments,
}: UseErpMetadataParams) {
  const [isContracted, setIsContracted] = useState(false)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhoneState, setCustomerPhoneState] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const isInitialLoadRef = useRef(true)

  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('')
  const [clientKtp, setClientKtp] = useState<string>('')
  const [clientAddress, setClientAddress] = useState<string>('')
  const [clientEmail, setClientEmail] = useState<string>('')
  const [leadIdForContract, setLeadIdForContract] = useState<string | null>(null)
  const [leadIdForCustomer, setLeadIdForCustomer] = useState<string | null>(null)

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')
  const [isZoneSearchOpen, setIsZoneSearchOpen] = useState(false)
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState<string>('')
  const [isTermSearchOpen, setIsTermSearchOpen] = useState(false)
  const [termSearchQuery, setTermSearchQuery] = useState('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (entityType === 'quotation') {
      const checkContract = async () => {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.from('erp_contracts').select('id').eq('quotation_id', entityId).maybeSingle()
        setIsContracted(!!data)
      }
      checkContract()
    }
  }, [entityId, entityType])

  useEffect(() => {
    if (customerProfile) {
      setCustomerName(customerProfile.name || '')
      setCustomerPhoneState(customerProfile.phone || '')
      setCustomerEmail(customerProfile.email || '')
      setCustomerAddress(customerProfile.address || '')
    }
  }, [customerProfile])

  useEffect(() => {
    if (isInitialLoadRef.current) return
    const phoneToUse = customerProfile?.phone || customerPhone
    if (!leadIdForCustomer && !phoneToUse) return
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const profilePayload = {
          name: customerName || null,
          phone: customerPhoneState || phoneToUse || null,
          email: customerEmail || null,
          address: customerAddress || null,
          lead_id: leadIdForCustomer
        }

        if (leadIdForCustomer) {
          const { data: existingByLead } = await supabase
            .from('erp_customer_profiles')
            .select('phone')
            .eq('lead_id', leadIdForCustomer)
            .maybeSingle()

          if (existingByLead) {
            await supabase
              .from('erp_customer_profiles')
              .update(profilePayload)
              .eq('lead_id', leadIdForCustomer)
          } else if (phoneToUse) {
            const { data: existingByPhone } = await supabase
              .from('erp_customer_profiles')
              .select('phone')
              .eq('phone', phoneToUse)
              .maybeSingle()

            if (existingByPhone) {
              await supabase
                .from('erp_customer_profiles')
                .update(profilePayload)
                .eq('phone', phoneToUse)
            } else {
              await supabase.from('erp_customer_profiles').insert(profilePayload)
            }
          } else {
            await supabase.from('erp_customer_profiles').insert(profilePayload)
          }

          await supabase
            .from('leads')
            .update({ location: customerAddress || null })
            .eq('id', leadIdForCustomer)
        } else if (phoneToUse) {
          await supabase
            .from('erp_customer_profiles')
            .update(profilePayload)
            .eq('phone', phoneToUse)
        }
      } catch (err) {
        console.error('Failed to auto-save customer profile:', err)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [customerName, customerPhoneState, customerEmail, customerAddress, customerProfile?.phone, customerPhone, leadIdForCustomer, customerProfile])

  const filteredZones = useMemo(() => zones.filter(z => z.name.toLowerCase().includes(zoneSearchQuery.toLowerCase())), [zones, zoneSearchQuery])
  const filteredTerms = useMemo(() => paymentTerms.filter(t => t.name.toLowerCase().includes(termSearchQuery.toLowerCase())), [paymentTerms, termSearchQuery])
  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  const selectedTerm = useMemo(() => paymentTerms.find(t => t.id === selectedPaymentTermId), [paymentTerms, selectedPaymentTermId])

  useEffect(() => {
    async function fetchMetadata() {
      setIsMetadataLoading(true)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const getLead = (value: unknown): LeadData | null => {
        if (!value) return null
        if (Array.isArray(value)) return (value[0] as LeadData) || null
        return value as LeadData
      }

      const { data: zonesData } = await supabase.from('zones').select('*').order('name')
      setZones(zonesData || [])

      if (entityType === 'contract') {
        const { data: contractData } = await supabase
          .from('erp_contracts')
          .select('*, erp_quotations(lead_id, leads(*), zone_id)')
          .eq('id', entityId)
          .maybeSingle()

        if (contractData) {
          const contractLead = getLead(contractData.erp_quotations?.leads)
          const leadId = contractData.erp_quotations?.lead_id || contractLead?.id || null
          setLeadIdForCustomer(leadId)
          setSelectedSignatoryId(contractData.signatory_id || '')
          setLeadIdForContract(leadId)
          setSelectedZoneId(contractData.erp_quotations?.zone_id || '')
          setNotes(contractData.terms_and_conditions || '')
          setAttachments(contractData.attachments || [])
          let loadedProfileFromDb = false

          if (leadId) {
            const { data: profile } = await supabase
              .from('erp_customer_profiles')
              .select('*')
              .eq('lead_id', leadId)
              .maybeSingle()

            if (profile) {
              loadedProfileFromDb = true
              setCustomerProfile(profile)
              setClientKtp(profile.ktp_number || contractData.client_ktp || '')
              setClientAddress(profile.address || '')
              setClientEmail(profile.email || '')
            } else {
              setClientKtp(contractData.client_ktp || '')
            }
          } else {
            setClientKtp(contractData.client_ktp || '')
          }

          if (!loadedProfileFromDb && contractLead) {
            if (contractLead) {
            setCustomerName(contractLead.name || '')
            setCustomerPhoneState(contractLead.phone || '')
            setCustomerEmail('')
            setCustomerAddress(contractLead.location || '')
            }
          }
        }
      }

      if (entityType === 'invoice') {
        const { data: invData } = await supabase
          .from('erp_invoices')
          .select('*, erp_contracts(*, erp_quotations(lead_id, leads(*), zone_id))')
          .eq('id', entityId)
          .maybeSingle()

        const invoiceLead = getLead(invData?.erp_contracts?.erp_quotations?.leads)
        const leadId = invData?.erp_contracts?.erp_quotations?.lead_id || invoiceLead?.id || null
        setLeadIdForCustomer(leadId)

        if (leadId) {
          const { data: profile } = await supabase
            .from('erp_customer_profiles')
            .select('*')
            .eq('lead_id', leadId)
            .maybeSingle()
          if (profile) setCustomerProfile(profile)
        }

        if (invoiceLead) {
          setCustomerName(invoiceLead.name || '')
          setCustomerPhoneState(invoiceLead.phone || '')
          setCustomerEmail('')
          setCustomerAddress(invoiceLead.location || '')
        }

        if (invData?.erp_contracts?.erp_quotations?.zone_id) {
          setSelectedZoneId(invData.erp_contracts.erp_quotations.zone_id)
        }
        setNotes(invData?.notes || '')
        setAttachments(invData?.attachments || [])
      }

      if (entityType === 'quotation') {
        const [termsRes, qtnRes] = await Promise.all([
          supabase.from('erp_payment_terms').select('*').eq('is_active', true),
          supabase.from('erp_quotations').select('lead_id, payment_term_id, zone_id, notes, attachments, leads(*)').eq('id', entityId).maybeSingle()
        ])

        if (termsRes.data) {
          setPaymentTerms(termsRes.data)
          if (qtnRes.data && !qtnRes.data.payment_term_id) {
            const defaultTerm = termsRes.data.find(t => t.is_default)
            if (defaultTerm) setSelectedPaymentTermId(defaultTerm.id)
          }
        }
        if (qtnRes.data) {
          const quotationLead = getLead(qtnRes.data.leads)
          setLeadIdForCustomer(qtnRes.data.lead_id || quotationLead?.id || null)
          if (qtnRes.data.payment_term_id) setSelectedPaymentTermId(qtnRes.data.payment_term_id)
          setSelectedZoneId(qtnRes.data.zone_id || '')
          setNotes(qtnRes.data.notes || '')
          setAttachments(qtnRes.data.attachments || [])

          const leadId = qtnRes.data.lead_id || quotationLead?.id
          if (leadId) {
            const { data: profile } = await supabase
              .from('erp_customer_profiles')
              .select('*')
              .eq('lead_id', leadId)
              .maybeSingle()
            if (profile) setCustomerProfile(profile)
          }

          if (quotationLead) {
            setCustomerName(quotationLead.name || '')
            setCustomerPhoneState(quotationLead.phone || '')
            setCustomerEmail('')
            setCustomerAddress(quotationLead.location || '')
          }
        }
      }
      setIsMetadataLoading(false)
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 500)
    }
    fetchMetadata()
  }, [entityId, entityType, setAttachments])

  useEffect(() => {
    if (!selectedZoneId || isInitialLoadRef.current) return
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        if (entityType === 'quotation') {
          await supabase.from('erp_quotations').update({ zone_id: selectedZoneId }).eq('id', entityId)
        } else if (entityType === 'contract') {
          const { data: contract } = await supabase.from('erp_contracts').select('quotation_id').eq('id', entityId).single()
          if (contract?.quotation_id) {
            await supabase.from('erp_quotations').update({ zone_id: selectedZoneId }).eq('id', contract.quotation_id)
          }
        }
      } catch (err) {
        console.error('Failed to update zone:', err)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [selectedZoneId, entityId, entityType])

  useEffect(() => {
    if (entityType === 'contract' && leadIdForContract) {
      const timer = setTimeout(async () => {
        try {
          await updateCustomerProfile(leadIdForContract, {
            ktp_number: clientKtp,
            address: clientAddress,
            email: clientEmail
          })
        } catch (err) {
          console.error('Auto-save error:', err)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [clientKtp, clientAddress, clientEmail, leadIdForContract, entityType])

  useEffect(() => {
    if (customerPhone) {
      async function fetchProfile() {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('erp_customer_profiles')
          .select('*')
          .eq('phone', customerPhone)
          .maybeSingle()
        setCustomerProfile(data)
      }
      fetchProfile()
    }
  }, [customerPhone])

  return {
    zones,
    isContracted,
    customerProfile,
    customerName,
    setCustomerName,
    customerPhoneState,
    setCustomerPhoneState,
    customerEmail,
    setCustomerEmail,
    customerAddress,
    setCustomerAddress,
    isMetadataLoading,
    selectedSignatoryId,
    setSelectedSignatoryId,
    clientKtp,
    setClientKtp,
    selectedZoneId,
    setSelectedZoneId,
    isZoneSearchOpen,
    setIsZoneSearchOpen,
    zoneSearchQuery,
    setZoneSearchQuery,
    filteredZones,
    selectedZone,
    paymentTerms,
    selectedPaymentTermId,
    setSelectedPaymentTermId,
    isTermSearchOpen,
    setIsTermSearchOpen,
    termSearchQuery,
    setTermSearchQuery,
    filteredTerms,
    selectedTerm,
    notes,
    setNotes,
    clientAddress,
    clientEmail,
    setClientAddress,
    setClientEmail,
  }
}
