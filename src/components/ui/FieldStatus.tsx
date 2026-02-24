'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'

type Props = {
  valid?: boolean
  message?: string
}

export default function FieldStatus({ valid, message }: Props) {
  if (!valid && !message) return null
  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs">
      {valid ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {message && <span className="text-emerald-600">{message}</span>}
        </>
      ) : (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          {message && <span className="text-red-600">{message}</span>}
        </>
      )}
    </div>
  )
}

