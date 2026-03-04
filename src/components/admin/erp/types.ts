export interface PipelineItem {
  id?: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  subtotal: number
  type: string
}

export interface Quotation {
  id: string
  quotation_number: string
  status: string
  total_amount: number
  version?: number
  created_at: string
  leads?: {
    name: string
    phone?: string
  }
  erp_quotation_items?: PipelineItem[]
}

export interface Contract {
  id: string
  contract_number: string
  status: string
  total_value: number
  created_at: string
  quotation_id?: string
  erp_quotations?: {
    leads?: {
      phone?: string
    }
  }
  erp_contract_items?: PipelineItem[]
  payment_terms_json?: {
    t1_percent?: number
    t2_percent?: number
    t3_percent?: number
    [key: string]: unknown
  } | {
    percent: number
    label: string
  }[] | null
}

export interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_paid: number
  payment_stage?: string
  contract_id?: string
  created_at: string
  erp_contracts?: {
    id?: string
    erp_quotations?: {
      leads?: {
        name?: string
        phone?: string
      }
    }
  }
  erp_invoice_items?: PipelineItem[]
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action_type: string
  new_value: unknown
  timestamp?: string
  created_at?: string
}

export interface Signatory {
  id: string
  name: string
  job_title: string
}

export interface GroupedQuotation {
  latest: Quotation
  versions: Quotation[]
}
