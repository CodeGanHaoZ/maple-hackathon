import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

type Poi = { id: string; name: string; subtitle: string; kind: string; description: string; image: string; coordinates: [number, number]; tags: string[] }
type Maple = { poiId: string; stage: string; redBand: string; progressPercent: number | null; density: string; view: string; observedAt: string; source: string; validUntil: string; status: '有效' | '已过期' }
type FacilityKind = 'parking' | 'toilet' | 'shuttle' | 'rest' | 'seat'
type Facility = { id: string; name: string; kind: FacilityKind; location: string; note: string; coordinates: [number, number]; status: '演示记录' | '待核验' }
type ShuttleStop = { id: string; name: string; coordinates: [number, number]; note: string }
type ShuttleRoute = { id: string; name: string; stopIds: string[]; operatingNote: string; coordinates: [number, number][] }

const pois: Poi[] = [
  { id: 'mirror-lake', name: '明镜湖', subtitle: '水面映秋 · 轻松可达', kind: 'view', description: '湖面开阔，适合观察倒影与林色层次。沿湖慢行可找到安静的停留点。', image: '/assets/lake-reflection.png', coordinates: [118.958, 32.147], tags: ['看层次', '倒影'] },
  { id: 'maple-valley', name: '枫林谷', subtitle: '成片红叶 · 林下光影', kind: 'maple', description: '红叶林沿缓坡展开，光线变化明显。现场以成片密度和颜色层次为主要看点。', image: '/assets/maple-canopy.png', coordinates: [118.965, 32.151], tags: ['看成片', '看色彩'] },
  { id: 'autumn-gate', name: '秋山入口', subtitle: '山门前 · 方向清楚', kind: 'landmark', description: '作为核验范围的入口地标，适合出发前确认路线与补给。', image: '/assets/gate-autumn.png', coordinates: [118.953, 32.144], tags: ['起点', '地标'] },
  { id: 'red-leaf-terrace', name: '红叶坡', subtitle: '高处视角 · 需留意台阶', kind: 'view', description: '可观察山谷的纵深和秋色渐变，现有资料提示含台阶，出发前请确认体力条件。', image: '/assets/maple-stairs.png', coordinates: [118.971, 32.157], tags: ['看视角', '有台阶'] },
  { id: 'reflection-bend', name: '水岸回望', subtitle: '临水停留 · 观察倒影', kind: 'view', description: '水岸折返点，适合短暂停留和拍摄水面层次。', image: '/assets/reflection.png', coordinates: [118.961, 32.148], tags: ['看倒影', '可停留'] }
]

const maple: Maple[] = [
  { poiId: 'maple-valley', stage: '红绿相间', redBand: '约 50%–75%', progressPercent: 68, density: '成片，林下覆盖连续', view: '逆光层次清楚', observedAt: '2026-10-30', source: '现场观察记录（演示数据）', validUntil: '2026-11-02T23:59:59+08:00', status: '有效' },
  { poiId: 'mirror-lake', stage: '初红', redBand: '约 25%–50%', progressPercent: 38, density: '沿湖零散至成片', view: '水面倒影较好', observedAt: '2026-10-29', source: '现场观察记录（演示数据）', validUntil: '2026-11-02T23:59:59+08:00', status: '有效' },
  { poiId: 'red-leaf-terrace', stage: '盛红', redBand: '约 75% 以上', progressPercent: 82, density: '坡面连续，受天气影响', view: '高处俯瞰视角', observedAt: '2026-10-28', source: '现场观察记录（演示数据）', validUntil: '2026-11-01T23:59:59+08:00', status: '有效' },
  { poiId: 'reflection-bend', stage: '未知', redBand: '暂无信息', progressPercent: null, density: '暂无信息', view: '临水视角已核验', observedAt: '2026-10-15', source: '历史记录（演示数据）', validUntil: '2026-10-20T23:59:59+08:00', status: '已过期' }
]

const currentMaple = (): Maple[] => maple.map((record) => Date.now() > new Date(record.validUntil).getTime() ? { ...record, status: '已过期', progressPercent: null } : record)

const routes = [
  { id: 'lake-loop', name: '明镜湖轻行线', duration: '45–60 分钟', distance: '约 1.8 km', audience: ['family', 'couple', 'senior', 'other'], difficulty: '轻松', stairs: 'unknown', start: '秋山入口', end: '水岸回望', image: '/assets/lake-reflection.png', stops: ['秋山入口', '明镜湖', '水岸回望'], reason: '沿湖看倒影，时间口径含停留与返回段；适合慢慢走。', facilities: '沿线休息点记录 2 处；座位空闲情况未知。' },
  { id: 'maple-valley-path', name: '枫林谷成片观色线', duration: '70–90 分钟', distance: '约 2.6 km', audience: ['photo_outdoor', 'couple', 'other'], difficulty: '中等', stairs: 'yes', start: '秋山入口', end: '枫林谷', image: '/assets/maple-canopy.png', stops: ['秋山入口', '明镜湖', '枫林谷'], reason: '现有演示记录显示枫林谷成片密度较高，适合观察颜色层次。', facilities: '枫林谷入口附近有休息点记录；无实时占用信息。' },
  { id: 'terrace-view', name: '红叶坡高处视角线', duration: '90–120 分钟', distance: '约 3.4 km', audience: ['photo_outdoor', 'other'], difficulty: '需留意体力', stairs: 'yes', start: '秋山入口', end: '红叶坡', image: '/assets/maple-stairs.png', stops: ['秋山入口', '枫林谷', '红叶坡'], reason: '高处可看山谷纵深，但资料提示包含台阶，需按个人情况选择。', facilities: '中段休息信息待补充。' }
]

const facilities: Facility[] = [
  { id: 'parking-gate', name: '秋山入口停车场', kind: 'parking', location: '秋山入口外侧', note: '车位余量、收费和开放状态待现场核验；演示数据', coordinates: [118.9524, 32.1435], status: '待核验' },
  { id: 'parking-east', name: '明镜湖东停车区', kind: 'parking', location: '明镜湖东侧', note: '停车区位置记录；容量与开放状态待现场核验；演示数据', coordinates: [118.9642, 32.1467], status: '待核验' },
  { id: 'toilet-gate', name: '入口服务点厕所', kind: 'toilet', location: '秋山入口附近', note: '开放状态、无障碍设施和厕位情况待现场核验；演示数据', coordinates: [118.9533, 32.1443], status: '待核验' },
  { id: 'toilet-lake', name: '明镜湖游客服务点厕所', kind: 'toilet', location: '明镜湖北侧', note: '厕所点位记录；开放状态待现场核验；演示数据', coordinates: [118.9594, 32.1485], status: '待核验' },
  { id: 'toilet-valley', name: '枫林谷入口厕所', kind: 'toilet', location: '枫林谷入口', note: '厕所点位记录；开放状态待现场核验；演示数据', coordinates: [118.9648, 32.1507], status: '待核验' },
  { id: 'rest-lake', name: '明镜湖北侧休息点', kind: 'rest', location: '明镜湖北侧', note: '可停留；是否有座位需以现场为准；演示数据', coordinates: [118.959, 32.148], status: '演示记录' },
  { id: 'seat-lake', name: '湖畔座位', kind: 'seat', location: '明镜湖东岸', note: '有座位记录，空闲情况未知；演示数据', coordinates: [118.9618, 32.1478], status: '演示记录' },
  { id: 'rest-valley', name: '枫林谷入口休息点', kind: 'rest', location: '枫林谷入口', note: '可停留；遮阴信息待补充；演示数据', coordinates: [118.9653, 32.1512], status: '待核验' }
]

const shuttleStops: ShuttleStop[] = [
  { id: 'shuttle-gate', name: '秋山入口接驳站', coordinates: [118.953, 32.144], note: '接驳站位置为演示记录，班次与运营状态待现场核验' },
  { id: 'shuttle-lake', name: '明镜湖接驳站', coordinates: [118.9602, 32.148], note: '接驳站位置为演示记录，班次与运营状态待现场核验' },
  { id: 'shuttle-valley', name: '枫林谷接驳站', coordinates: [118.9656, 32.151], note: '接驳站位置为演示记录，班次与运营状态待现场核验' },
  { id: 'shuttle-terrace', name: '红叶坡接驳站', coordinates: [118.9707, 32.1566], note: '接驳站位置为演示记录，班次与运营状态待现场核验' }
]

const shuttleRoutes: ShuttleRoute[] = [
  { id: 'shuttle-main-loop', name: '入口—明镜湖—枫林谷环线', stopIds: ['shuttle-gate', 'shuttle-lake', 'shuttle-valley', 'shuttle-gate'], operatingNote: '线路和班次为演示数据，请以现场公告为准。', coordinates: shuttleStops.slice(0, 3).map((stop) => stop.coordinates).concat([shuttleStops[0].coordinates]) },
  { id: 'shuttle-high-view', name: '枫林谷—红叶坡观景线', stopIds: ['shuttle-valley', 'shuttle-terrace'], operatingNote: '线路和班次为演示数据，请以现场公告为准。', coordinates: shuttleStops.slice(2).map((stop) => stop.coordinates) }
]

const mapFacilities: Facility[] = facilities.concat(shuttleStops.map((stop) => ({ ...stop, kind: 'shuttle' as const, location: stop.name, status: '待核验' as const })))
const seasonThemes = [
  { id: 'spring', name: '春·山醒', months: [3, 4, 5], headline: '寻花访古，走进春山', accentToken: 'moss-600', secondaryToken: 'paper-100', features: ['春花与新绿', '古寺文化', '轻徒步'], note: '季节主题为展示配置，花期和活动以官方公告为准。' },
  { id: 'summer', name: '夏·林荫', months: [6, 7, 8], headline: '林荫慢行，静听山声', accentToken: 'summer-forest', secondaryToken: 'moss-600', features: ['森林避暑', '亲子自然', '清凉慢行'], note: '季节主题为展示配置，开放范围与天气提示以官方公告为准。' },
  { id: 'autumn', name: '秋·枫染', months: [9, 10, 11], headline: '读懂枫况，也读懂栖霞', accentToken: 'leaf-text', secondaryToken: 'gilt-500', features: ['枫况观测', '秋色游线', '山寺人文'], note: '红度百分比为演示观测值，需结合观测时间、来源和有效期阅读。' },
  { id: 'winter', name: '冬·山静', months: [12, 1, 2], headline: '冬山清寂，文化有声', accentToken: 'indigo-600', secondaryToken: 'ink-500', features: ['冬日山景', '文化讲解', '暖心服务'], note: '季节主题为展示配置，结冰、交通和运营情况以官方公告为准。' }
]

const meta = () => ({ requestId: crypto.randomUUID(), dataVersion: 'demo-v1', generatedAt: new Date().toISOString() })
const ok = (data: unknown) => ({ data, meta: meta() })

app.get('/api/v1/bootstrap', (c) => c.json(ok({ productName: '栖霞山核心', coverage: { id: 'qixia-demo', name: '栖霞山局部核验范围（演示）', description: '道路、点位与枫况均为演示数据，不能用于现场导航。' }, map: { provider: 'tianditu', center: [118.961, 32.149], zoom: 14, keyConfiguredClientSide: true, attribution: '天地图 · 栖霞山演示覆盖范围' }, seasonThemes, audiences: ['photo_outdoor', 'couple', 'family', 'family_senior', 'senior', 'other'], interests: ['color', 'density', 'view'], features: { personalObservation: true, chat: true, mapFacilities: true, seasonalThemes: true } })))
app.get('/api/v1/pois', (c) => c.json(ok(pois)))
app.get('/api/v1/pois/:id', (c) => { const poi = pois.find((item) => item.id === c.req.param('id')); if (!poi) return c.json({ error: { code: 'NOT_FOUND', message: '内容不存在' }, requestId: meta().requestId }, 404); return c.json(ok({ ...poi, maple: currentMaple().find((item) => item.poiId === poi.id), routes: routes.filter((route) => route.stops.includes(poi.name)) })) })
app.get('/api/v1/maple', (c) => c.json(ok(currentMaple().map((item) => ({ ...item, poi: pois.find((poi) => poi.id === item.poiId) })))))
app.get('/api/v1/maple/:poiId', (c) => { const records = currentMaple().filter((item) => item.poiId === c.req.param('poiId')); return c.json(ok({ current: records[0], history: records, poi: pois.find((item) => item.id === c.req.param('poiId')) })) })
app.get('/api/v1/routes', (c) => c.json(ok(routes)))
app.get('/api/v1/routes/:id', (c) => { const route = routes.find((item) => item.id === c.req.param('id')); if (!route) return c.json({ error: { code: 'NOT_FOUND', message: '路线不存在' } }, 404); return c.json(ok(route)) })
app.get('/api/v1/facilities', (c) => { const kind = c.req.query('kind'); return c.json(ok(kind ? mapFacilities.filter((item) => item.kind === kind) : mapFacilities)) })
app.get('/api/v1/map', (c) => c.json(ok({
  provider: 'tianditu',
  coverage: { id: 'qixia-demo', name: '栖霞山局部核验范围（演示）', center: [118.961, 32.149], zoom: 14, description: '底图由客户端接入天地图；覆盖点位、线路和状态均为演示数据，不能替代现场导航。' },
  pois,
  facilities: mapFacilities,
  parking: facilities.filter((item) => item.kind === 'parking'),
  toilets: facilities.filter((item) => item.kind === 'toilet'),
  shuttleStops,
  shuttleRoutes,
  legend: [
    { kind: 'parking', label: '停车场' },
    { kind: 'toilet', label: '厕所' },
    { kind: 'shuttle', label: '接驳车站点' },
    { kind: 'poi', label: '景观点位' }
  ],
  disclaimer: '点位与线路为结构化演示数据，开放状态、班次、车位和设施情况需现场核验。'
})))

const recommendSchema = z.object({ audience: z.string().default('other'), interest: z.string().nullable().optional(), maxMinutes: z.number().optional(), constraints: z.object({ noStairs: z.boolean().optional(), strollerRequired: z.boolean().optional() }).optional() })
app.post('/api/v1/recommendations/routes', async (c) => { const input = recommendSchema.safeParse(await c.req.json().catch(() => ({}))); if (!input.success) return c.json({ error: { code: 'BAD_REQUEST', message: '参数不完整' } }, 400); const { audience, maxMinutes, constraints } = input.data; let items = routes.filter((route) => route.audience.includes(audience) || audience === 'other'); if (constraints?.noStairs) items = items.filter((route) => route.stairs === 'no'); if (maxMinutes) items = items.filter((route) => Number(route.duration.split('–')[1]) <= maxMinutes); return c.json(ok({ status: items.length ? 'matched' : 'unmatched', items, appliedContext: input.data, unmatchedReasons: items.length ? [] : ['当前演示数据中没有同时满足全部条件的已核验路线'] })) })
app.post('/api/v1/recommendations/maple', async (c) => { const input = await c.req.json().catch(() => ({})); const interest = input.interest; const active = currentMaple().filter((item) => item.status === '有效').filter((item) => !interest || (interest === 'density' ? item.density.includes('成片') : interest === 'color' ? item.redBand !== '暂无信息' : item.view !== '暂无信息')); return c.json(ok({ items: active.slice(0, 3).map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId), reason: interest === 'density' ? record.density : interest === 'view' ? record.view : record.redBand })) })) })
app.post('/api/v1/chat', async (c) => {
  const { message = '' } = await c.req.json().catch(() => ({}))
  const text = String(message).toLowerCase()
  const facilityKind = /厕所|卫生间|洗手间/.test(text) ? 'toilet' : /停车|车位/.test(text) ? 'parking' : /接驳|摆渡|观光车/.test(text) ? 'shuttle' : null
  const wantsRoute = text.includes('路线') || text.includes('老人')
  const cards = facilityKind ? mapFacilities.filter((item) => item.kind === facilityKind) : wantsRoute ? routes.slice(0, 2) : text.includes('枫') ? currentMaple().slice(0, 3).map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId) })) : pois.slice(0, 2)
  const answer = facilityKind === 'toilet' ? '可在地图查看入口、明镜湖和枫林谷的厕所演示点位，开放状态仍需现场核验。' : facilityKind === 'parking' ? '可在地图查看秋山入口和明镜湖东侧的停车演示点位，车位余量、收费及开放状态仍需现场核验。' : facilityKind === 'shuttle' ? '可在地图查看接驳站点与线路演示，班次、乘车费用和运营状态请以现场公告为准。' : wantsRoute ? '可以先看明镜湖轻行线；它的时间口径含停留与返回段。演示数据不等同于现场导航。' : '我可以帮你查看四季景观、路线、厕所、停车、接驳车和当前演示枫况。你也可以直接从下方卡片进入。'
  return c.json(ok({ answer, cards, citations: ['演示数据：人工整理的结构化样例'], degraded: true }))
})
app.post('/api/v1/feedback', async (c) => { const input = await c.req.json().catch(() => ({})); return c.json(ok({ id: crypto.randomUUID(), status: 'pending', message: '感谢反馈，已记录为待处理事项。', received: input.category ?? 'content' }), 201) })
app.post('/api/v1/events', async (c) => c.json(ok({ accepted: true })))
app.get('/api/v1/admin/summary', (c) => c.json(ok({ counts: { pois: pois.length, routes: routes.length, maple: maple.length, facilities: mapFacilities.length }, recent: [{ action: '发布演示数据', at: '2026-10-31 18:00', operator: 'demo-admin' }] })))
app.get('/api/v1/health', (c) => c.json({ ok: true }))

if (process.env.NODE_ENV !== 'test') serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) })
export default app
