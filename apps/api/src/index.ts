import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

type Poi = { id: string; name: string; subtitle: string; kind: string; description: string; image: string; coordinates: [number, number]; tags: string[] }
type Maple = { poiId: string; stage: string; redBand: string; progressPercent: number | null; density: string; view: string; observedAt: string; source: string; validUntil: string; status: '有效' | '已过期' }
type FacilityKind = 'parking' | 'toilet' | 'shuttle' | 'rest' | 'seat'
type Facility = { id: string; name: string; kind: FacilityKind; location: string; note: string; coordinates: [number, number]; status: '已核验' }
type ShuttleStop = { id: string; name: string; coordinates: [number, number]; note: string }
type ShuttleRoute = { id: string; name: string; stopIds: string[]; operatingNote: string; coordinates: [number, number][] }

// Publish only records supported by reviewed source material.
// The October 31 field note is qualitative and has no per-point measurements.
const pois: Poi[] = []
const maple: Maple[] = []
type Route = { id: string; name: string; audience: string[]; stairs: string; duration: string; stops: string[]; distance: string; difficulty: string; start: string; end: string; image: string; reason: string; facilities: string }
const routes: Route[] = []
const facilities: Facility[] = []
const shuttleStops: ShuttleStop[] = []
const shuttleRoutes: ShuttleRoute[] = []
const mapFacilities = facilities
const currentMaple = (): Maple[] => maple.map(record => Date.now() > Date.parse(record.validUntil) ? { ...record, status: '已过期', progressPercent: null } : record)
const foliageContext = {
  kind: 'official-bulletin', publishedAt: '2026-10-30T18:13:00+08:00',
  progressPercent: 10,
  summary: '红叶开始转色，大面积红叶尚未到来',
  source: '栖霞山官方公众号',
  reference: { label: '【枫情预报】红叶已经按捺不住！彩叶上新，活动精彩不断', url: 'https://mp.weixin.qq.com/s/xubdcBQ4x4kGIOf8ucr67A' },
  scope: '官方推文发布进度，非实时监测，也不代表某一具体点位的红叶占比。',
  fieldReport: {
    observationPeriod: '2026-10-31 下午', progressPercent: null,
    summary: '本次采风观察到大部分叶片仍为绿色，少量微黄',
    source: '项目团队实地采风反馈',
    scope: '未按具体点位统计，不换算百分比。'
  }
}
const currentContext = () => foliageContext

const seasonThemes = [
  { id: 'spring', name: '春·山醒', months: [3, 4, 5], headline: '寻花访古，走进春山', accentToken: 'moss-600', secondaryToken: 'paper-100', features: ['春花与新绿', '古寺文化', '轻徒步'], note: '季节主题为展示配置，花期和活动以官方公告为准。' },
  { id: 'summer', name: '夏·林荫', months: [6, 7, 8], headline: '林荫慢行，静听山声', accentToken: 'summer-forest', secondaryToken: 'moss-600', features: ['森林避暑', '亲子自然', '清凉慢行'], note: '季节主题为展示配置，开放范围与天气提示以官方公告为准。' },
  { id: 'autumn', name: '秋·枫染', months: [9, 10, 11], headline: '读懂枫况，也读懂栖霞', accentToken: 'leaf-text', secondaryToken: 'gilt-500', features: ['枫况观测', '秋色游线', '山寺人文'], note: '官方进度保留发布日期和来源；点位红度另按有效观测发布。' },
  { id: 'winter', name: '冬·山静', months: [12, 1, 2], headline: '冬山清寂，文化有声', accentToken: 'indigo-600', secondaryToken: 'ink-500', features: ['冬日山景', '文化讲解', '暖心服务'], note: '季节主题为展示配置，结冰、交通和运营情况以官方公告为准。' }
]

const meta = () => ({ requestId: crypto.randomUUID(), generatedAt: new Date().toISOString() })
const ok = (data: unknown) => ({ data, meta: meta() })

app.get('/api/v1/bootstrap', (c) => c.json(ok({ productName: '栖霞游鉴助手', coverage: { id: 'qixia', name: '栖霞山', description: '官方枫况与采风分别保留来源；分点位记录和业务坐标尚待核验。' }, map: { provider: 'tianditu', center: [118.961, 32.149], zoom: 14, attribution: '天地图 · 栖霞山' }, seasonThemes, audiences: ['photo_outdoor', 'couple', 'family', 'family_senior', 'senior', 'other'], interests: ['color', 'density', 'view'], features: { personalObservation: false, chat: true, mapFacilities: true, seasonalThemes: true } })))
app.get('/api/v1/foliage-context', (c) => c.json(ok(currentContext())))
app.get('/api/v1/pois', (c) => c.json(ok(pois)))
app.get('/api/v1/pois/:id', (c) => { const poi = pois.find((item) => item.id === c.req.param('id')); if (!poi) return c.json({ error: { code: 'NOT_FOUND', message: '内容不存在' }, requestId: meta().requestId }, 404); return c.json(ok({ ...poi, maple: currentMaple().find((item) => item.poiId === poi.id), routes: routes.filter((route) => route.stops.includes(poi.name)) })) })
app.get('/api/v1/maple', (c) => c.json(ok(currentMaple().map((item) => ({ ...item, poi: pois.find((poi) => poi.id === item.poiId) })))))
app.get('/api/v1/maple/:poiId', (c) => { const records = currentMaple().filter((item) => item.poiId === c.req.param('poiId')); return c.json(ok({ current: records[0], history: records, poi: pois.find((item) => item.id === c.req.param('poiId')) })) })
app.get('/api/v1/routes', (c) => c.json(ok(routes)))
app.get('/api/v1/routes/:id', (c) => { const route = routes.find((item) => item.id === c.req.param('id')); if (!route) return c.json({ error: { code: 'NOT_FOUND', message: '路线不存在' } }, 404); return c.json(ok(route)) })
app.get('/api/v1/facilities', (c) => { const kind = c.req.query('kind'); return c.json(ok(kind ? mapFacilities.filter((item) => item.kind === kind) : mapFacilities)) })
app.get('/api/v1/map', (c) => c.json(ok({
  provider: 'tianditu',
  coverage: { id: 'qixia', name: '栖霞山', center: [118.961, 32.149], zoom: 14, description: '实际地图与园区参考图片分区查看；图片不与定位配准。' },
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
  disclaimer: '设施坐标与接驳线路尚未核验，可先查阅园区导览图中的设施图例；运营情况以园区公告为准。'
})))

const recommendSchema = z.object({ audience: z.string().default('other'), interest: z.string().nullable().optional(), maxMinutes: z.number().optional(), constraints: z.object({ noStairs: z.boolean().optional(), strollerRequired: z.boolean().optional() }).optional() })
app.post('/api/v1/recommendations/routes', async (c) => { const input = recommendSchema.safeParse(await c.req.json().catch(() => ({}))); if (!input.success) return c.json({ error: { code: 'BAD_REQUEST', message: '参数不完整' } }, 400); const { audience, maxMinutes, constraints } = input.data; let items = routes.filter((route) => route.audience.includes(audience) || audience === 'other'); if (constraints?.noStairs) items = items.filter((route) => route.stairs === '无'); if (constraints?.strollerRequired) items = items.filter((route) => /推车|轮椅/.test(route.facilities)); if (maxMinutes) items = items.filter((route) => { const minutes = route.duration.match(/\d+/g)?.map(Number) ?? []; return minutes.length ? Math.min(...minutes) <= maxMinutes : true }); return c.json(ok({ status: items.length ? 'matched' : 'unmatched', items, appliedContext: input.data, unmatchedReasons: items.length ? [] : ['暂无满足条件的已核验路线'] })) })
app.post('/api/v1/recommendations/maple', async (c) => { const input = await c.req.json().catch(() => ({})); const interest = input.interest; const active = currentMaple().filter((item) => item.status === '有效').filter((item) => !interest || (interest === 'density' ? item.density.includes('成片') : interest === 'color' ? item.redBand !== '暂无信息' : item.view !== '暂无信息')); return c.json(ok({ items: active.slice(0, 3).map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId), reason: interest === 'density' ? record.density : interest === 'view' ? record.view : record.redBand })) })) })
app.post('/api/v1/chat', async (c) => {
  const { message = '' } = await c.req.json().catch(() => ({}))
  const text = String(message).toLowerCase()
  const facilityKind = /厕所|卫生间|洗手间/.test(text) ? 'toilet' : /停车|车位/.test(text) ? 'parking' : /接驳|摆渡|观光车/.test(text) ? 'shuttle' : null
  const wantsRoute = text.includes('路线') || text.includes('老人')
  const cards = facilityKind ? mapFacilities.filter(item => item.kind === facilityKind) : wantsRoute ? routes : []
  const context = currentContext()
  const answer = facilityKind ? '地图服务提供地点检索、官方小程序地点目录和园区导览图。授权定位后，可查看已有坐标地点距你的直线距离；未匹配坐标的地点仅列出名称和位置说明。开放状态与接驳运营信息请咨询园区工作人员。'
    : wantsRoute ? '目前暂无已核验的路线时长、台阶及通行信息。请先查阅园区导览图，同行有老人或儿童时向园区工作人员确认路况。'
    : /枫|红|绿/.test(text) ? `2026-10-30 官方推文发布的红叶进度为 ${context.progressPercent}%。这是发布时的进度，非实时监测或具体点位统计。${context.fieldReport.observationPeriod}采风：${context.fieldReport.summary}。采风未按具体点位统计，不换算百分比；后续变化请以园区更新为准。`
    : '地图服务上方展示实际地图，下方可切换插画赏秋图和园区导览图。枫况按有来源的观测更新；尚未确认的路线、班次和设施状态会保持待更新。'
  return c.json(ok({ answer, cards, citations: /枫|红|绿/.test(text) && context ? [context.source, context.reference.url] : [], degraded: true }))
})
// Unavailable persistence must never return a fabricated acceptance receipt.
app.post('/api/v1/feedback', c => c.json({ error: { code: 'UNAVAILABLE', message: '暂未开通在线反馈，请向园区工作人员反馈。' } }, 503))
app.get('/api/v1/health', (c) => c.json({ ok: true }))

if (process.env.NODE_ENV !== 'test') serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) })
export default app
