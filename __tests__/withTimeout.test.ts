import { describe, it, expect } from 'vitest'
import { TimeoutError, withTimeout } from '../src/lib/withTimeout'

describe('withTimeout', () => {
  it('resolves when promise settles before timeout', async () => {
    const value = await withTimeout(Promise.resolve(42), 1000)
    expect(value).toBe(42)
  })

  it('rejects with TimeoutError when promise does not settle in time', async () => {
    const never = new Promise<void>(() => {})
    await expect(withTimeout(never, 10)).rejects.toBeInstanceOf(TimeoutError)
  })
})

