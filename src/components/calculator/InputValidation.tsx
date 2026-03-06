import { useState } from 'react'
import type { CalculatorInput, Catalog } from '@/lib/types'

export interface ValidationErrors {
  panjang?: string
  lebar?: string
  unitQty?: string
  catalogId?: string
  zoneId?: string
  customNotes?: string
  name?: string
  whatsapp?: string
}

export interface ValidationState {
  errors: ValidationErrors
  isValid: boolean
  touched: Record<keyof ValidationErrors, boolean>
}

const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
const MIN_ORDER_AREA = 10
const MIN_ORDER_LENGTH = 5

export function useInputValidation(input: CalculatorInput, leadInfo: { name: string; whatsapp: string }, catalogData: (Catalog & { base_price_unit?: 'm2' | 'm1' | 'unit' }) | null) {
  const [touched, setTouched] = useState<Record<keyof ValidationErrors, boolean>>({
    panjang: false,
    lebar: false,
    unitQty: false,
    catalogId: false,
    zoneId: false,
    customNotes: false,
    name: false,
    whatsapp: false,
  })

  const validateField = (field: keyof ValidationErrors, value: unknown): string | undefined => {
    const numValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : undefined
    const strValue = typeof value === 'string' ? value : undefined
    switch (field) {
      case 'panjang':
        if (input.jenis === 'standard') {
          const currentUnit = catalogData?.base_price_unit || 'm2'
          const minOrder = currentUnit === 'm1' ? MIN_ORDER_LENGTH : MIN_ORDER_AREA
          if (numValue === undefined || numValue <= 0) return 'Panjang harus lebih dari 0'
          if (currentUnit === 'm2' && input.lebar && numValue * input.lebar < minOrder) {
            return `Minimum order ${minOrder} m²`
          }
          if (currentUnit === 'm1' && numValue < minOrder) {
            return `Minimum order ${minOrder} m¹`
          }
        }
        break
      case 'lebar':
        if (input.jenis === 'standard') {
          const minOrder = MIN_ORDER_AREA
          if (numValue === undefined || numValue <= 0) return 'Lebar harus lebih dari 0'
          if (input.panjang && numValue * input.panjang < minOrder) {
            return `Minimum order ${minOrder} m²`
          }
        }
        break
      case 'unitQty':
        if (input.jenis === 'standard') {
          if (numValue === undefined || numValue <= 0) return 'Jumlah unit harus lebih dari 0'
        }
        break
      case 'catalogId':
        if (input.jenis === 'standard' && !value) {
          return 'Silakan pilih paket katalog'
        }
        break
      case 'customNotes':
        if (input.jenis === 'custom' && (!strValue || strValue.trim().length < 10)) {
          return 'Deskripsi custom minimal 10 karakter'
        }
        break
      case 'name':
        if (!leadInfo.name || leadInfo.name.trim().length < 2) {
          return 'Nama lengkap minimal 2 karakter'
        }
        break
      case 'whatsapp':
        if (!leadInfo.whatsapp) return 'Nomor WhatsApp wajib diisi'
        if (!WHATSAPP_REGEX.test(leadInfo.whatsapp.replace(/\s+/g, ''))) {
          return 'Format nomor tidak valid. Gunakan format Indonesia (08xxx)'
        }
        break
    }
    return undefined
  }

  const validateAll = (): ValidationState => {
    const errors: ValidationErrors = {}
    
    // Validate dimensions based on unit type
    if (input.jenis === 'standard') {
      const currentUnitType = catalogData?.base_price_unit || 'm2'
      
      if (currentUnitType === 'unit') {
        errors.unitQty = validateField('unitQty', input.unitQty)
      } else if (currentUnitType === 'm1') {
        errors.panjang = validateField('panjang', input.panjang)
      } else {
        errors.panjang = validateField('panjang', input.panjang)
        errors.lebar = validateField('lebar', input.lebar)
      }
      
      errors.catalogId = validateField('catalogId', input.catalogId)
    } else {
      // Custom request validation
      errors.customNotes = validateField('customNotes', input.customNotes)
    }

    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (!errors[key as keyof ValidationErrors]) {
        delete errors[key as keyof ValidationErrors]
      }
    })

    const isValid = Object.keys(errors).length === 0

    return {
      errors,
      isValid,
      touched,
    }
  }

  const touchField = (field: keyof ValidationErrors) => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }))
  }

  const touchAll = () => {
    setTouched({
      panjang: true,
      lebar: true,
      unitQty: true,
      catalogId: true,
      zoneId: true,
      customNotes: true,
      name: true,
      whatsapp: true,
    })
  }

  const resetValidation = () => {
    setTouched({
      panjang: false,
      lebar: false,
      unitQty: false,
      catalogId: false,
      zoneId: false,
      customNotes: false,
      name: false,
      whatsapp: false,
    })
  }

  const validation = validateAll()

  return {
    validation,
    validateField,
    validateAll,
    touchField,
    touchAll,
    resetValidation,
  }
}

export function getFieldError(
  field: keyof ValidationErrors,
  validation: ValidationState
): string | undefined {
  return validation.touched[field] ? validation.errors[field] : undefined
}

export function shouldShowError(
  field: keyof ValidationErrors,
  validation: ValidationState
): boolean {
  return Boolean(validation.touched[field] && validation.errors[field])
}
