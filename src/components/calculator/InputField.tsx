import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  touched?: boolean
  onTouch?: () => void
  helperText?: string
  required?: boolean
  icon?: React.ReactNode
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, touched, onTouch, helperText, required, icon, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const showError = touched && error
    
    // Call onTouch when blurred to ensure validation triggers
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      if (onTouch) onTouch()
      props.onBlur?.(e)
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
          {!icon && label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={handleBlur}
            className={`
              w-full px-3 py-2 border rounded-lg transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/20
              ${showError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}
              ${isFocused && !showError ? 'border-primary/50' : ''}
              ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}
            `}
          />
        </div>
        <div className="min-h-[1.25rem]">
          {showError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
          {!showError && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      </div>
    )
  }
)

InputField.displayName = 'InputField'

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  touched?: boolean
  onTouch?: () => void
  helperText?: string
  required?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, touched, onTouch, helperText, required, icon, className = '', children, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const showError = touched && error
    
    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(false)
      if (onTouch) onTouch()
      props.onBlur?.(e)
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
          {!icon && label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <select
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={handleBlur}
            className={`
              w-full px-3 py-2 border rounded-lg transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/20
              ${showError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}
              ${isFocused && !showError ? 'border-primary/50' : ''}
              ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}
            `}
          >
            {children}
          </select>
        </div>
        <div className="min-h-[1.25rem]">
          {showError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
          {!showError && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      </div>
    )
  }
)

SelectField.displayName = 'SelectField'

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  touched?: boolean
  onTouch?: () => void
  helperText?: string
  required?: boolean
  icon?: React.ReactNode
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, touched, onTouch, helperText, required, icon, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const showError = touched && error
    
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      if (onTouch) onTouch()
      props.onBlur?.(e)
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
          {!icon && label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <textarea
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={handleBlur}
            className={`
              w-full px-3 py-2 border rounded-lg transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/20
              ${showError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}
              ${isFocused && !showError ? 'border-primary/50' : ''}
              ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}
            `}
          />
        </div>
        <div className="min-h-[1.25rem]">
          {showError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
          {!showError && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      </div>
    )
  }
)

TextAreaField.displayName = 'TextAreaField'
