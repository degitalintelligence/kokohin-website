import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullscreen?: boolean
  text?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  className, 
  fullscreen = false,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const spinner = (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin"></div>
      </div>
      {text && (
        <span className="ml-3 text-gray-700 font-medium">{text}</span>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          {text && (
            <p className="text-gray-600 font-medium">{text}</p>
          )}
        </div>
      </div>
    )
  }

  return spinner
}

// Full page loader component
export function FullPageLoader({ text = 'Memuat...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 font-medium">{text}</p>
      </div>
    </div>
  )
}

// Button loading spinner (for buttons with loading state)
export function ButtonLoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-2">Memproses...</span>
    </div>
  )
}