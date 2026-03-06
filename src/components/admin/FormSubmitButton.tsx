'use client'

import { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

interface FormSubmitButtonProps {
  label: ReactNode
  loadingLabel?: ReactNode
  className?: string
}

export default function FormSubmitButton({
  label,
  loadingLabel,
  className = '',
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
    >
      {pending && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {pending ? loadingLabel ?? label : label}
    </button>
  )
}

