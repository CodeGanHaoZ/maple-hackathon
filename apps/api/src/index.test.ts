import { describe, expect, it } from 'vitest'
import app from './index.js'

describe('published visitor data', () => {
  it('returns no unverified content as published records', async () => {
    for (const path of ['/api/v1/pois', '/api/v1/maple', '/api/v1/routes', '/api/v1/facilities', '/api/v1/map']) {
      const response = await app.request(path)
      expect(response.status).toBe(200)
      const body = await response.json()
      if (path === '/api/v1/map') {
        expect(body.data.pois).toEqual([])
        expect(body.data.facilities).toEqual([])
        expect(body.data.shuttleRoutes).toEqual([])
      } else expect(body.data).toEqual([])
    }
  })

  it('separates official published progress from the qualitative field report', async () => {
    const response = await app.request('/api/v1/foliage-context')
    const body = await response.json()
    expect(body.data.publishedAt).toBe('2026-10-30T18:13:00+08:00')
    expect(body.data.progressPercent).toBe(10)
    expect(body.data.fieldReport.observationPeriod).toBe('2026-10-31 下午')
    expect(body.data.fieldReport.summary).toContain('大部分叶片仍为绿色')
    expect(body.data.fieldReport.progressPercent).toBeNull()
    expect(body.data.fieldReport).not.toHaveProperty('observedAt')
    expect(body.data.reference.url).toContain('mp.weixin.qq.com')
  })

  it('does not return an invented version marker', async () => {
    const response = await app.request('/api/v1/bootstrap')
    const body = await response.json()
    expect(body.data.productName).toBe('栖霞游鉴助手')
    expect(body.meta).not.toHaveProperty('dataVersion')
    expect(body.data.seasonThemes.map((theme: { id: string }) => theme.id)).toEqual(['spring', 'summer', 'autumn', 'winter'])
  })

  it('answers foliage questions from the field note without a fabricated number', async () => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '现在枫叶红了吗？' }) })
    const body = await response.json()
    expect(body.data.answer).toContain('10-31')
    expect(body.data.answer).toContain('大部分叶片仍为绿色')
    expect(body.data.answer).toContain('10%')
    expect(body.data.answer).toContain('2026-10-30')
    expect(body.data.answer).toContain('非实时监测或具体点位统计')
    expect(body.data.citations).toHaveLength(2)
  })

  it('returns unavailable instead of claiming feedback was stored', async () => {
    const response = await app.request('/api/v1/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: 'map' }) })
    expect(response.status).toBe(503)
  })
})
