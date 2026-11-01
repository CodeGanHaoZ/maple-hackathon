import { describe, expect, it, vi } from 'vitest'
import { distanceMeters, formatDistance, loadMapPlaces, matchRecommendedPlace, type MapPlace } from './mapPlaces'
import { createPlaceSearch } from './mapSearch'

vi.mock('./mapSearch', () => ({ createPlaceSearch: vi.fn() }))

describe('地图地点与距离', () => {
  it('推荐别名只对应景点，不误选同名前缀的设施', () => {
    const place = (name: string, kind: string): MapPlace => ({ id: name, name, kind, coordinates: [118.96, 32.15], location: '', note: '', source: 'test' })
    const places = [place('明镜湖卫生间', 'toilet'), place('千佛岩停车场', 'parking'), place('栖霞山-千佛岩', 'poi'), place('明镜湖', 'poi')]
    expect(matchRecommendedPlace('千佛崖', places)?.name).toBe('栖霞山-千佛岩')
    expect(matchRecommendedPlace('彩虹明镜', places)?.name).toBe('明镜湖')
    expect(matchRecommendedPlace('陆羽茶庄', places)).toBeUndefined()
    expect(matchRecommendedPlace('千佛崖', places.slice(0, 2))).toBeUndefined()
  })
  it('计算地理坐标直线距离，零距离与对跖点不产生 NaN', () => {
    expect(distanceMeters([118.961, 32.149], [118.961, 32.149])).toBe(0)
    expect(distanceMeters([0, 0], [1, 0])).toBeCloseTo(111195.08, 1)
    expect(distanceMeters([0, 0], [180, 0])).toBeCloseTo(20015114.44, 1)
    expect(formatDistance(432)).toBe('432 m')
    expect(formatDistance(1540)).toBe('1.5 km')
  })

  it('拒绝无坐标、园外点和泛化设施匹配，并对重复地点去重', async () => {
    const query = vi.fn().mockImplementation(async (keyword: string) => {
      if (keyword === '栖霞山') return [
        { name: '千佛岩', lonlat: '118.96,32.15', hotPointID: 'one' },
        { name: '千佛岩', lonlat: '118.96,32.15', hotPointID: 'one' },
        { name: '园外地点', lonlat: '120,30' },
        { name: '缺失坐标' },
        { name: '坐标无效', lonlat: ',32.15' }
      ]
      return [{ name: '普通山路', lonlat: '118.96,32.15' }]
    })
    vi.mocked(createPlaceSearch).mockResolvedValue(query)
    const result = await loadMapPlaces('test-key', true)
    expect(result.places.some(p => p.name === '千佛岩' && p.officialName === '千佛岩')).toBe(true)
    expect(result.places.filter(p => p.name === '千佛岩')).toHaveLength(1)
    expect(result.places.every(p => p.kind === 'poi')).toBe(true)
    expect(result.places.some(p => /园外|缺失|无效/.test(p.name))).toBe(false)
  })

  it('保留成功结果并报告部分失败，允许重新请求', async () => {
    vi.mocked(createPlaceSearch).mockResolvedValue(async keyword => {
      if (keyword.includes('厕所')) throw new Error('offline')
      return [{ name: '明镜湖卫生间', lonlat: '118.96,32.15', hotPointID: 'wc' }]
    })
    const result = await loadMapPlaces('test-key', true)
    expect(result.failures).toBeGreaterThan(0)
    expect(result.places).toHaveLength(1)
    expect(result.places[0].kind).toBe('toilet')
  })
})
