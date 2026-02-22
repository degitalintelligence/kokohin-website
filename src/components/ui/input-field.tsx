import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | string[]
  touched?: boolean
  required?: boolean
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      error,
      touched,
      required,
      className,
      containerClassName,
      labelClassName,
      errorClassName,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const errorMessage = Array.isArray(error) ? error[0] : error
    const showError = errorMessage && touched

    return (
      <div className={cn('mb-4', containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'label block mb-2 font-medium text-gray-700',
              required && "after:content-['*'] after:ml-1 after:text-red-500",
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          className={cn(
            'input w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-200',
            showError
              ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-primary',
            props.disabled && 'bg-gray-100 cursor-not-allowed',
            className
          )}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : undefined}
          {...props}
        />
        {showError && (
          <div
            id={`${id}-error`}
            className={cn(
              'mt-2 flex items-center gap-2 text-sm text-red-600',
              errorClassName
            )}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    )
  }
)

InputField.displayName = 'InputField'

export { InputField }