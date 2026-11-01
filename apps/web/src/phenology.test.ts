import { describe, expect, it } from 'vitest'
import { leafColor, seasonAt } from './phenology'

describe('景区季节与叶色', () => {
  it.each([
    ['2026-02-28T15:59:59Z', 'winter'], ['2026-02-28T16:00:00Z', 'spring'],
    ['2026-05-31T16:00:00Z', 'summer'], ['2026-08-31T16:00:00Z', 'autumn'],
    ['2026-11-30T15:59:59Z', 'autumn'], ['2026-11-30T16:00:00Z', 'winter']
  ])('南京时间跨月 %s 使用 %s', (time, expected) => {
    expect(seasonAt(Date.parse(time))).toBe(expected)
  })
  it('未知值与 0% 区分，低值保持绿黄，高值转红', () => {
    expect(leafColor(null)).not.toBe(leafColor(0))
    expect(leafColor(NaN)).toBe(leafColor(null))
    expect(leafColor(10)).toContain('var(--moss-600) 80%')
    expect(leafColor(100)).not.toContain('moss')
    expect(leafColor(-1)).toBe(leafColor(0))
    expect(leafColor(120)).toBe(leafColor(100))
  })
})
