import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ServiceRel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function serviceNameFromRel(input: ServiceRel | ServiceRel[] | null | undefined): string {
  if (!input) return '-'
  return Array.isArray(input) ? String(input[0]?.name ?? '-') : String(input.name ?? '-')
}

export function serviceIdFromRel(input: ServiceRel | ServiceRel[] | null | undefined): string {
  if (!input) return ''
  return Array.isArray(input) ? String(input[0]?.id ?? '') : String(input.id ?? '')
}

export function firstRel<T>(input: T | T[] | null | undefined): T | null {
  if (!input) return null
  return Array.isArray(input) ? (input[0] ?? null) : input
}

export function relNameFrom(input: { name: string | null } | { name: string | null }[] | null | undefined): string {
  if (!input) return '-'
  return Array.isArray(input) ? String(input[0]?.name ?? '-') : String(input.name ?? '-')
}
