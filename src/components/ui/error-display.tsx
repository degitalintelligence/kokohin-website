import { ReactNode } from 'react'
import { AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  title?: string
  message: string | ReactNode
  variant?: 'error' | 'warning' | 'info'
  className?: string
  onDismiss?: () => void
  showIcon?: boolean
  action?: ReactNode
}

export function ErrorDisplay({
  title,
  message,
  variant = 'error',
  className,
  onDismiss,
  showIcon = true,
  action,
}: ErrorDisplayProps) {
  const variantConfig = {
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      iconColor: 'text-yellow-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-500',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        config.bg,
        config.border,
        config.text,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold mb-1 text-sm">{title}</h3>
          )}
          <div className="text-sm">{message}</div>
          {action && (
            <div className="mt-3">{action}</div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 ml-2 p-1"
            aria-label="Tutup"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Error boundary fallback component
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary?: () => void
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <ErrorDisplay
        title="Terjadi Kesalahan"
        message={
          <div className="space-y-2">
            <p className="font-medium">Aplikasi mengalami masalah teknis.</p>
            <p className="text-sm text-gray-600">
              Silakan refresh halaman atau coba beberapa saat lagi.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {error.message}
              </pre>
            )}
          </div>
        }
        variant="error"
        className="max-w-2xl"
        action={
          resetErrorBoundary && (
            <button
              onClick={resetErrorBoundary}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Coba Lagi
            </button>
          )
        }
      />
    </div>
  )
}

// Utility function to get user-friendly error messages
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('fetch')) {
      return 'Koneksi internet terputus. Periksa koneksi Anda dan coba lagi.'
    }

    if (message.includes('timeout') || message.includes('request timeout')) {
      return 'Permintaan terlalu lama. Silakan coba lagi.'
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'Akses ditolak. Silakan login terlebih dahulu.'
    }

    if (message.includes('not found')) {
      return 'Data tidak ditemukan.'
    }

    if (message.includes('server') || message.includes('internal')) {
      return 'Server sedang mengalami masalah. Silakan coba beberapa saat lagi.'
    }

    // Return original message with first letter capitalized
    return error.message.charAt(0).toUpperCase() + error.message.slice(1)
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
}