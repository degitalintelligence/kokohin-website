import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api-response'
import type { CalculatorInput } from '@/lib/types'
import { calculateCanopyPrice } from '@/lib/calculator'

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null) as { input?: CalculatorInput } | null
    const input = json?.input
    if (!input) {
      return errorResponse('BAD_REQUEST', 'Invalid request body', 400)
    }

    const result = await calculateCanopyPrice(input)
    return NextResponse.json({ result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse('INTERNAL_ERROR', 'Failed to calculate price', 500, message)
  }
}

