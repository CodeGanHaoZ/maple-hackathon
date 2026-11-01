import { createPlaceSearch, type SearchPoi } from './mapSearch'

export type Coordinates = [number, number]
export type MapPlace = { id: string; name: string; kind: string; coordinates: Coordinates; location: string; note: string; source: string; officialName?: string }
export type PlaceResult = { places: MapPlace[]; failures: number }

const bounds = [118.935, 32.13, 118.985, 32.18] as const
// 名称与位置说明来自用户提供的官方小程序截图；截图距离不作为坐标。
export const officialPlaceCatalog = [
  { name: '栖霞山西门P2停车场', kind: 'parking', location: '西门停车场出入口', aliases: ['P2停车场', '西门停车场'] },
  { name: '栖霞山风景区P1大客车停车场', kind: 'parking', location: '栖霞大道与红枫路交叉口西北240米', aliases: ['P1停车场', '大客车停车场'] },
  { name: '栖霞山风景名胜区-P3地上停车场', kind: 'parking', location: '栖霞街与20县道交叉口南60米', aliases: ['P3地上停车场', 'P3停车场'] },
  { name: '古镇南停车场', kind: 'parking', location: '栖霞街48号', aliases: ['古镇南停车场'] },
  { name: '栖霞山景区南门停车场', kind: 'parking', location: '景区南门地面停车场', aliases: ['南门停车场'] },
  { name: '栖霞山风景区管委会东停车场', kind: 'parking', location: '南水新村98号管委会东侧', aliases: ['管委会东停车场'] },
  { name: '鼓楼卫生间', kind: 'toilet', location: '鼓楼附近', aliases: ['鼓楼卫生间'] },
  { name: '明镜湖卫生间', kind: 'toilet', location: '明镜湖附近', aliases: ['明镜湖卫生间'] },
  { name: '西门入口卫生间', kind: 'toilet', location: '西门进入左侧；官方列表名称为“卫生间”', aliases: ['西门入口卫生间'] },
  { name: '西门游客中心', kind: 'toilet', location: '官方小程序厕所分类内的西门游客中心', aliases: ['西门游客中心卫生间'] },
  { name: '南门游客中心卫生间', kind: 'toilet', location: '南门游客中心', aliases: ['南门游客中心卫生间'] },
  { name: '太虚亭卫生间', kind: 'toilet', location: '太虚亭附近', aliases: ['太虚亭卫生间'] },
  ...['千佛岩', '乾隆行宫遗址', '桃花湖', '珍珠泉', '有凌云意观景平台', '天开岩', '了凡问道', '始皇临江处', '陆羽茶庄', '蝴蝶谷', '栖霞山·半馆'].map(name => ({ name, kind: 'poi', location: '栖霞山景区', aliases: [name] }))
]
const searches = [
  ['栖霞山', 'poi'], ['栖霞山 卫生间', 'toilet'], ['栖霞山 厕所', 'toilet'],
  ['栖霞山 停车场', 'parking'], ['栖霞山 观光车', 'shuttle'], ['栖霞山 接驳', 'shuttle'],
  ['栖霞山 游客中心', 'visitor'], ['栖霞山 休息亭', 'rest'],
  ...officialPlaceCatalog.map(item => [`栖霞山 ${item.name.replace(/^栖霞山/, '')}`, item.kind])
] as const
let cached: Promise<PlaceResult> | undefined

/** 使用浏览器端 Key 从天地图检索地点；用户定位不会发送至检索接口。 */
export function loadMapPlaces(key: string, retry = false): Promise<PlaceResult> {
  if (cached && !retry) return cached
  cached = (async () => {
    const query = await createPlaceSearch(key, bounds)
    const results: PromiseSettledResult<MapPlace[]>[] = []
    // 限制并发，避免一次打开页面向服务发出几十个请求。
    for (let start = 0; start < searches.length; start += 4) {
      results.push(...await Promise.allSettled(searches.slice(start, start + 4).map(async ([keyWord, category]) => {
        const records = await query(keyWord)
        return records.flatMap((poi: SearchPoi): MapPlace[] => {
        const coordinates = poi.lonlat?.split(',').map(Number)
        if (!poi.name || !coordinates || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) return []
        const [lng, lat] = coordinates
        if (lng < bounds[0] || lng > bounds[2] || lat < bounds[1] || lat > bounds[3]) return []
        let kind: string = 'poi'
        if (/卫生间|厕所|公厕/.test(poi.name)) kind = 'toilet'
        else if (/停车|停车场/.test(poi.name)) kind = 'parking'
        else if (/观光车|接驳|摆渡/.test(poi.name)) kind = 'shuttle'
        else if (/游客中心|游客服务/.test(poi.name)) kind = 'visitor'
        else if (/亭|休息|座椅/.test(poi.name)) kind = 'rest'
        else if (category === 'poi' && /酒店|宾馆|餐|饭|商店|超市|售票|公交|地铁|公司|小区|银行|派出所|充电|学校|便利|宿/.test(poi.name)) return []
        // 设施检索必须由返回名称确认类型，不能把泛化匹配当成设施点。
        if (category !== 'poi' && kind !== category) return []
        const official = officialPlaceCatalog.find(item => item.kind === kind && item.aliases.some(alias => poi.name!.includes(alias)))
        return [{ id: `tdt-${poi.hotPointID || `${lng}-${lat}`}`, name: poi.name, kind, coordinates: [lng, lat], location: poi.address || '栖霞山周边', note: '开放及运营情况以园区现场为准。', source: '实际地图地点检索', officialName: official?.name }]
      })
      })))
    }
    const places = new Map<string, MapPlace>()
    for (const result of results) if (result.status === 'fulfilled') for (const place of result.value) places.set(place.id, place)
    const value = { places: [...places.values()], failures: results.filter(item => item.status === 'rejected').length }
    if (value.failures) cached = undefined
    return value
  })().catch(error => { cached = undefined; throw error })
  return cached
}

/** Haversine 球面直线距离，单位米；不代表园区步行距离。 */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(to[1] - from[1]), dLng = radians(to[0] - from[0])
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(dLng / 2) ** 2
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.min(1, a)))
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

/** Match the sight itself, never a toilet or parking with a similar name. */
export function matchRecommendedPlace(name: string, places: MapPlace[]): MapPlace | undefined {
  const aliases: Record<string, string[]> = { '千佛崖': ['千佛岩'], '栖霞山山门殿': ['山门殿'], '彩虹明镜': ['明镜湖'] }
  const normalize = (value: string) => value.replace(/^南京市?/, '').replace(/^栖霞山(?:风景名胜区|风景区|景区)?[-·]?/, '').replace(/[\s·—-]/g, '')
  const names = [name, ...(aliases[name] ?? [])].map(normalize)
  return places.find(item => item.kind === 'poi' && names.includes(normalize(item.name)))
}
