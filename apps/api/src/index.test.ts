import { afterEach, describe, expect, it, vi } from 'vitest'
import app from './index.js'

describe('public API', () => {
  afterEach(() => vi.useRealTimers())
  it('returns bootstrap contract', async () => {
    const response = await app.request('/api/v1/bootstrap')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.coverage.description).toContain('演示数据')
    expect(body.data.productName).toBe('栖霞山核心')
    expect(body.data.seasonThemes.map((theme: { id: string }) => theme.id)).toEqual(['spring', 'summer', 'autumn', 'winter'])
  })
  it('filters route recommendations by audience', async () => {
    const response = await app.request('/api/v1/recommendations/routes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audience: 'senior' }) })
    const body = await response.json()
    expect(body.data.items.some((item: { id: string }) => item.id === 'lake-loop')).toBe(true)
  })
  it('returns map facilities for parking, toilets and shuttle stops', async () => {
    const response = await app.request('/api/v1/map')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.provider).toBe('tianditu')
    expect(body.data.parking.some((item: { kind: string }) => item.kind === 'parking')).toBe(true)
    expect(body.data.toilets.some((item: { kind: string }) => item.kind === 'toilet')).toBe(true)
    expect(body.data.shuttleStops.length).toBeGreaterThanOrEqual(2)
    expect(body.data.shuttleRoutes.length).toBeGreaterThanOrEqual(1)
    expect(body.data.disclaimer).toContain('演示数据')
  })
  it.each(['parking', 'toilet', 'shuttle'])('filters facilities by %s', async (kind) => {
    const response = await app.request(`/api/v1/facilities?kind=${kind}`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    expect(body.data.every((item: { kind: string }) => item.kind === kind)).toBe(true)
  })
  it('keeps unknown maple progress distinct from zero', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T10:00:00+08:00'))
    const response = await app.request('/api/v1/maple')
    const body = await response.json()
    expect(body.data.find((item: { poiId: string }) => item.poiId === 'reflection-bend').progressPercent).toBeNull()
    expect(body.data.find((item: { poiId: string }) => item.poiId === 'maple-valley').progressPercent).toBe(68)
  })
  it('expires maple observations using their validity date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T10:00:00+08:00'))
    const response = await app.request('/api/v1/maple')
    const body = await response.json()
    expect(body.data.every((item: { status: string; progressPercent: number | null }) => item.status === '已过期' && item.progressPercent === null)).toBe(true)
  })
  it.each([['停车场在哪里', 'parking'], ['接驳车怎么坐', 'shuttle']])('answers facility questions: %s', async (message, kind) => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) })
    const body = await response.json()
    expect(body.data.cards.length).toBeGreaterThan(0)
    expect(body.data.cards.every((item: { kind: string }) => item.kind === kind)).toBe(true)
    expect(body.data.answer).toContain('演示')
  })
})
