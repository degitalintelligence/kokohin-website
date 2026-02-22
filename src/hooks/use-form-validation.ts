import { useState, useCallback } from 'react'

export type ValidationRule = {
  required?: boolean
  pattern?: RegExp
  message: string
  validator?: (value: string) => boolean
}

export type ValidationRules = Record<string, ValidationRule[]>

export type ValidationErrors = Record<string, string[]>

export function useFormValidation<T extends Record<string, string>>(
  initialData: T,
  rules: ValidationRules
) {
  const [data, setData] = useState<T>(initialData)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (name: string, value: string) => {
      const fieldRules = rules[name] || []
      const fieldErrors: string[] = []

      for (const rule of fieldRules) {
        if (rule.required && !value.trim()) {
          fieldErrors.push(rule.message)
          break // Stop at first error per field
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          fieldErrors.push(rule.message)
          break
        }

        if (rule.validator && !rule.validator(value)) {
          fieldErrors.push(rule.message)
          break
        }
      }

      return fieldErrors
    },
    [rules]
  )

  const validateForm = useCallback(() => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    Object.keys(rules).forEach((fieldName) => {
      const value = data[fieldName] || ''
      const fieldErrors = validateField(fieldName, value)

      if (fieldErrors.length > 0) {
        newErrors[fieldName] = fieldErrors
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [data, rules, validateField])

  const handleChange = useCallback(
    (name: string, value: string) => {
      setData((prev) => ({ ...prev, [name]: value }))

      // Clear error when user starts typing
      if (errors[name]?.length) {
        setErrors((prev) => ({ ...prev, [name]: [] }))
      }
    },
    [errors]
  )

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }))
      const value = data[name] || ''
      const fieldErrors = validateField(name, value)
      setErrors((prev) => ({ ...prev, [name]: fieldErrors }))
    },
    [data, validateField]
  )

  const setFieldValue = useCallback((name: string, value: string) => {
    setData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])

  return {
    data,
    errors,
    touched,
    validateForm,
    handleChange,
    handleBlur,
    setFieldValue,
    resetForm,
    setData,
    setErrors,
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'Field ini wajib diisi'): ValidationRule => ({
    required: true,
    message,
  }),
  email: (message = 'Format email tidak valid'): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message,
  }),
  phone: (message = 'Format nomor telepon tidak valid'): ValidationRule => ({
    pattern: /^(\+62|62|0)8[1-9][0-9]{6,9}$/,
    message,
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value) => value.length >= min,
    message: message || `Minimal ${min} karakter`,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value) => value.length <= max,
    message: message || `Maksimal ${max} karakter`,
  }),
}
