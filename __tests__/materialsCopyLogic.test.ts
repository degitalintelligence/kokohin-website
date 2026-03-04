import { describe, it, expect } from 'vitest'
import { buildCopyName, buildCopyCode } from '../src/lib/materialsCopyLogic'

describe('materials copy logic', () => {
  it('should prefix name with "Copy of"', () => {
    expect(buildCopyName('Besi Hollow 40x40')).toBe('Copy of Besi Hollow 40x40')
  })

  it('should generate base COPY code when unused', () => {
    const code = buildCopyCode('MAT-001', [])
    expect(code).toBe('MAT-001-COPY')
  })

  it('should append incremental suffix when COPY code already exists', () => {
    const existing = ['MAT-001-COPY', 'MAT-001-COPY-2']
    const code = buildCopyCode('MAT-001', existing)
    expect(code).toBe('MAT-001-COPY-3')
  })
})

