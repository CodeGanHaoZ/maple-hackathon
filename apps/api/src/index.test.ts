import { describe, expect, it } from 'vitest'
import app from './index.js'

describe('public API', () => {
  it('returns bootstrap contract', async () => {
    const response = await app.request('/api/v1/bootstrap')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.coverage.description).toContain('演示数据')
  })
  it('filters route recommendations by audience', async () => {
    const response = await app.request('/api/v1/recommendations/routes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audience: 'senior' }) })
    const body = await response.json()
    expect(body.data.items.some((item: { id: string }) => item.id === 'lake-loop')).toBe(true)
  })
})
