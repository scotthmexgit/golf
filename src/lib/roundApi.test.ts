import { describe, it, expect, vi, afterEach } from 'vitest'
import { patchRoundComplete } from './roundApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('patchRoundComplete', () => {
  it('returns ok:true on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }))
    const result = await patchRoundComplete(14)
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      '/golf/api/rounds/14',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'Complete' }) })
    )
  })

  it('returns ok:true on 409 (already Complete)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 409 }))
    const result = await patchRoundComplete(7)
    expect(result.ok).toBe(true)
  })

  it('returns ok:false on 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500 }))
    const result = await patchRoundComplete(1)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await patchRoundComplete(1)
    expect(result.ok).toBe(false)
  })
})
