import { describe, expect, it } from 'vitest'
import app from './index.js'

describe('published visitor data', () => {
  it('returns the field-survey records with their sources intact', async () => {
    for (const path of ['/api/v1/pois', '/api/v1/maple', '/api/v1/routes', '/api/v1/facilities']) {
      const response = await app.request(path)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeGreaterThan(0)
    }
    const map = await (await app.request('/api/v1/map')).json()
    expect(map.data.pois.length).toBeGreaterThan(0)
    expect(map.data.toilets.length).toBeGreaterThan(0)
    expect(map.data.disclaimer).toContain('以园区公告为准')
  })

  it('answers route questions with the published duration and stair data', async () => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '带老人，推荐一条路线' }) })
    const body = await response.json()
    expect(body.data.answer).toContain('银发慢游')
    expect(body.data.answer).toContain('60–80 分钟')
    expect(body.data.answer).toContain('台阶：无')
    expect(body.data.answer).toContain('16:00 停止进入')
    expect(body.data.citations.length).toBe(2)
  })

  it('answers facility questions from the foldout facilities', async () => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '哪里有厕所？' }) })
    const body = await response.json()
    expect(body.data.answer).toContain('西门入口卫生间')
    expect(body.data.answer).toContain('天街')
    expect(body.data.cards.length).toBe(3)
  })

  it('answers point questions with the field-observed red band', async () => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '红叶谷值得去吗' }) })
    const body = await response.json()
    expect(body.data.answer).toContain('台阶 68 级')
    expect(body.data.answer).toContain('20%–30%')
  })

  it('refuses to invent ticket price or opening hours', async () => {
    const response = await app.request('/api/v1/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '门票多少钱？几点开门' }) })
    const body = await response.json()
    expect(body.data.answer).toContain('没有获取到官方发布数据')
    expect(body.data.answer).not.toMatch(/\d+\s*元/)
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
