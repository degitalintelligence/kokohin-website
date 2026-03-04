import { toast as hotToast } from 'react-hot-toast'

type ToastVariant = 'default' | 'destructive'

type ToastOptions = {
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastFn = (options: ToastOptions) => void

type UseToastResult = {
  toast: ToastFn
}

export function useToast(): UseToastResult {
  const toast: ToastFn = ({ title, description, variant }) => {
    const parts: string[] = []
    if (title) parts.push(title)
    if (description) parts.push(description)
    const message = parts.join(': ')

    if (variant === 'destructive') {
      hotToast.error(message || description || title || 'Terjadi kesalahan')
    } else {
      hotToast(message || description || title || '')
    }
  }

  return { toast }
}

