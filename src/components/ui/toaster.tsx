'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

// Custom toast function with Kokohin brand styling
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      classNames: {
        toast: '!bg-white !border !border-green-200 !shadow-lg !font-sans',
        title: '!text-green-800 !font-semibold',
        description: '!text-green-700 !text-sm',
        closeButton: '!text-green-600 hover:!bg-green-50',
      },
    })
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      classNames: {
        toast: '!bg-white !border !border-red-200 !shadow-lg !font-sans',
        title: '!text-red-800 !font-semibold',
        description: '!text-red-700 !text-sm',
        closeButton: '!text-red-600 hover:!bg-red-50',
      },
    })
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
      classNames: {
        toast: '!bg-white !border !border-yellow-200 !shadow-lg !font-sans',
        title: '!text-yellow-800 !font-semibold',
        description: '!text-yellow-700 !text-sm',
        closeButton: '!text-yellow-600 hover:!bg-yellow-50',
      },
    })
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: <Info className="w-4 h-4 text-blue-600" />,
      classNames: {
        toast: '!bg-white !border !border-blue-200 !shadow-lg !font-sans',
        title: '!text-blue-800 !font-semibold',
        description: '!text-blue-700 !text-sm',
        closeButton: '!text-blue-600 hover:!bg-blue-50',
      },
    })
  },
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
      classNames: {
        toast: '!bg-white !border !border-gray-200 !shadow-lg !font-sans',
        title: '!text-gray-800 !font-semibold',
        description: '!text-gray-700 !text-sm',
        closeButton: '!text-gray-600 hover:!bg-gray-50',
      },
    })
  },
  dismiss: (id?: string) => {
    sonnerToast.dismiss(id)
  },
}

// Toaster component to be placed in layout
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-white !border !border-gray-200 !shadow-lg !font-sans !rounded-lg',
          title: '!text-gray-800 !font-semibold !text-sm',
          description: '!text-gray-600 !text-sm',
          actionButton: '!bg-primary !text-white hover:!bg-primary/90 !font-medium',
          cancelButton: '!bg-gray-200 !text-gray-800 hover:!bg-gray-300 !font-medium',
        },
      }}
    />
  )
}

// Hook for using toast (optional)
export function useToast() {
  return toast
}