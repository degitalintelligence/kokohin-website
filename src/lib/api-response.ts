import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      code,
      message,
      details: details ?? null,
    },
    { status }
  )
}
