import { CheckCircle, Circle, AlertCircle } from 'lucide-react'
import type { CalculatorInput, CalculatorResult } from '@/lib/types'

export interface ProgressStep {
  id: string
  title: string
  description?: string
  status: 'completed' | 'current' | 'pending' | 'error'
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className = '' }: ProgressIndicatorProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed' || index < currentStep
          const isCurrent = index === currentStep
          const isError = step.status === 'error'
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${isCompleted ? 'bg-primary text-white' : ''}
                  ${isCurrent && !isError ? 'bg-primary/20 text-primary border-2 border-primary' : ''}
                  ${isError ? 'bg-red-100 text-red-600 border-2 border-red-300' : ''}
                  ${!isCompleted && !isCurrent && !isError ? 'bg-gray-100 text-gray-400' : ''}
                `}>
                  {isCompleted && !isError && <CheckCircle className="w-4 h-4" />}
                  {isCurrent && !isError && <Circle className="w-4 h-4 fill-current" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {!isCompleted && !isCurrent && !isError && <Circle className="w-4 h-4" />}
                </div>
                
                <div className="mt-2 text-center">
                  <p className={`
                    text-xs font-medium
                    ${isCompleted ? 'text-primary' : ''}
                    ${isCurrent ? 'text-primary font-semibold' : ''}
                    ${isError ? 'text-red-600' : ''}
                    ${!isCompleted && !isCurrent && !isError ? 'text-gray-500' : ''}
                  `}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-1 max-w-24">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 mt-4
                  ${isCompleted ? 'bg-primary' : 'bg-gray-200'}
                `} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function useProgressSteps(
  input: Partial<CalculatorInput> | null,
  result: CalculatorResult | null,
  projectId: string | null
): ProgressStep[] {
  const steps: ProgressStep[] = [
    {
      id: 'input',
      title: 'Input Data',
      description: 'Masukkan dimensi dan pilihan',
      status: input && input.panjang && input.lebar && input.panjang > 0 && input.lebar > 0 ? 'completed' : 'current',
    },
    {
      id: 'contact',
      title: 'Kontak',
      description: 'Isi data kontak Anda',
      status: 'pending',
    },
    {
      id: 'calculation',
      title: 'Perhitungan',
      description: 'Hitung estimasi biaya',
      status: result ? 'completed' : 'pending',
    },
    {
      id: 'result',
      title: 'Hasil',
      description: 'Lihat estimasi dan unduh PDF',
      status: projectId ? 'completed' : 'pending',
    },
  ]

  return steps
}
