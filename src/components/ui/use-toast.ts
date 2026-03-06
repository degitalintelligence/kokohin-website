import { toast as appToast } from '@/components/ui/toaster'

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
    if (variant === 'destructive') {
      appToast.error(title || 'Terjadi kesalahan', description)
    } else {
      appToast.success(title || description || 'Berhasil', title ? description : undefined)
    }
  }

  return { toast }
}

