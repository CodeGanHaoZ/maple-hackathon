import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

type Poi = { id: string; name: string; subtitle: string; kind: string; description: string; image: string; coordinates: [number, number]; tags: string[] }
type Maple = { poiId: string; stage: string; redBand: string; density: string; view: string; observedAt: string; source: string; validUntil: string; status: '有效' | '已过期' }

const pois: Poi[] = [
  { id: 'mirror-lake', name: '明镜湖', subtitle: '水面映秋 · 轻松可达', kind: 'view', description: '湖面开阔，适合观察倒影与林色层次。沿湖慢行可找到安静的停留点。', image: '/assets/lake-reflection.png', coordinates: [118.958, 32.147], tags: ['看层次', '倒影'] },
  { id: 'maple-valley', name: '枫林谷', subtitle: '成片红叶 · 林下光影', kind: 'maple', description: '红叶林沿缓坡展开，光线变化明显。现场以成片密度和颜色层次为主要看点。', image: '/assets/maple-canopy.png', coordinates: [118.965, 32.151], tags: ['看成片', '看色彩'] },
  { id: 'autumn-gate', name: '秋山入口', subtitle: '山门前 · 方向清楚', kind: 'landmark', description: '作为核验范围的入口地标，适合出发前确认路线与补给。', image: '/assets/gate-autumn.png', coordinates: [118.953, 32.144], tags: ['起点', '地标'] },
  { id: 'red-leaf-terrace', name: '红叶坡', subtitle: '高处视角 · 需留意台阶', kind: 'view', description: '可观察山谷的纵深和秋色渐变，现有资料提示含台阶，出发前请确认体力条件。', image: '/assets/maple-stairs.png', coordinates: [118.971, 32.157], tags: ['看视角', '有台阶'] },
  { id: 'reflection-bend', name: '水岸回望', subtitle: '临水停留 · 观察倒影', kind: 'view', description: '水岸折返点，适合短暂停留和拍摄水面层次。', image: '/assets/reflection.png', coordinates: [118.961, 32.148], tags: ['看倒影', '可停留'] }
]

const maple: Maple[] = [
  { poiId: 'maple-valley', stage: '红绿相间', redBand: '约 50%–75%', density: '成片，林下覆盖连续', view: '逆光层次清楚', observedAt: '2026-10-30', source: '现场观察记录（演示数据）', validUntil: '2026-11-02T23:59:59+08:00', status: '有效' },
  { poiId: 'mirror-lake', stage: '初红', redBand: '约 25%–50%', density: '沿湖零散至成片', view: '水面倒影较好', observedAt: '2026-10-29', source: '现场观察记录（演示数据）', validUntil: '2026-11-02T23:59:59+08:00', status: '有效' },
  { poiId: 'red-leaf-terrace', stage: '盛红', redBand: '约 75% 以上', density: '坡面连续，受天气影响', view: '高处俯瞰视角', observedAt: '2026-10-28', source: '现场观察记录（演示数据）', validUntil: '2026-11-01T23:59:59+08:00', status: '有效' },
  { poiId: 'reflection-bend', stage: '未知', redBand: '暂无信息', density: '暂无信息', view: '临水视角已核验', observedAt: '2026-10-15', source: '历史记录（演示数据）', validUntil: '2026-10-20T23:59:59+08:00', status: '已过期' }
]

const routes = [
  { id: 'lake-loop', name: '明镜湖轻行线', duration: '45–60 分钟', distance: '约 1.8 km', audience: ['family', 'couple', 'senior', 'other'], difficulty: '轻松', stairs: 'unknown', start: '秋山入口', end: '水岸回望', image: '/assets/lake-reflection.png', stops: ['秋山入口', '明镜湖', '水岸回望'], reason: '沿湖看倒影，时间口径含停留与返回段；适合慢慢走。', facilities: '沿线休息点记录 2 处；座位空闲情况未知。' },
  { id: 'maple-valley-path', name: '枫林谷成片观色线', duration: '70–90 分钟', distance: '约 2.6 km', audience: ['photo_outdoor', 'couple', 'other'], difficulty: '中等', stairs: 'yes', start: '秋山入口', end: '枫林谷', image: '/assets/maple-canopy.png', stops: ['秋山入口', '明镜湖', '枫林谷'], reason: '现有演示记录显示枫林谷成片密度较高，适合观察颜色层次。', facilities: '枫林谷入口附近有休息点记录；无实时占用信息。' },
  { id: 'terrace-view', name: '红叶坡高处视角线', duration: '90–120 分钟', distance: '约 3.4 km', audience: ['photo_outdoor', 'other'], difficulty: '需留意体力', stairs: 'yes', start: '秋山入口', end: '红叶坡', image: '/assets/maple-stairs.png', stops: ['秋山入口', '枫林谷', '红叶坡'], reason: '高处可看山谷纵深，但资料提示包含台阶，需按个人情况选择。', facilities: '中段休息信息待补充。' }
]

const facilities = [
  { id: 'toilet-gate', name: '入口服务点厕所', kind: 'toilet', location: '秋山入口附近', note: '开放状态待现场核验' },
  { id: 'rest-lake', name: '明镜湖北侧休息点', kind: 'rest', location: '明镜湖北侧', note: '可停留；是否有座位需以现场为准' },
  { id: 'seat-lake', name: '湖畔座位', kind: 'seat', location: '明镜湖东岸', note: '有座位记录，空闲情况未知' },
  { id: 'rest-valley', name: '枫林谷入口休息点', kind: 'rest', location: '枫林谷入口', note: '可停留；遮阴信息待补充' }
]

const meta = () => ({ requestId: crypto.randomUUID(), dataVersion: 'demo-v1', generatedAt: new Date().toISOString() })
const ok = (data: unknown) => ({ data, meta: meta() })

app.get('/api/v1/bootstrap', (c) => c.json(ok({ coverage: { id: 'qixia-demo', name: '栖霞山局部核验范围（演示）', description: '道路、点位与枫况均为演示数据，不能用于现场导航。' }, audiences: ['photo_outdoor', 'couple', 'family', 'family_senior', 'senior', 'other'], interests: ['color', 'density', 'view'], features: { personalObservation: true, chat: true } })))
app.get('/api/v1/pois', (c) => c.json(ok(pois)))
app.get('/api/v1/pois/:id', (c) => { const poi = pois.find((item) => item.id === c.req.param('id')); if (!poi) return c.json({ error: { code: 'NOT_FOUND', message: '内容不存在' }, requestId: meta().requestId }, 404); return c.json(ok({ ...poi, maple: maple.find((item) => item.poiId === poi.id), routes: routes.filter((route) => route.stops.includes(poi.name)) })) })
app.get('/api/v1/maple', (c) => c.json(ok(maple.map((item) => ({ ...item, poi: pois.find((poi) => poi.id === item.poiId) })))))
app.get('/api/v1/maple/:poiId', (c) => { const record = maple.find((item) => item.poiId === c.req.param('poiId')); return c.json(ok({ current: record, history: maple.filter((item) => item.poiId === c.req.param('poiId')), poi: pois.find((item) => item.id === c.req.param('poiId')) })) })
app.get('/api/v1/routes', (c) => c.json(ok(routes)))
app.get('/api/v1/routes/:id', (c) => { const route = routes.find((item) => item.id === c.req.param('id')); if (!route) return c.json({ error: { code: 'NOT_FOUND', message: '路线不存在' } }, 404); return c.json(ok(route)) })
app.get('/api/v1/facilities', (c) => { const kind = c.req.query('kind'); return c.json(ok(kind ? facilities.filter((item) => item.kind === kind) : facilities)) })

const recommendSchema = z.object({ audience: z.string().default('other'), interest: z.string().nullable().optional(), maxMinutes: z.number().optional(), constraints: z.object({ noStairs: z.boolean().optional(), strollerRequired: z.boolean().optional() }).optional() })
app.post('/api/v1/recommendations/routes', async (c) => { const input = recommendSchema.safeParse(await c.req.json().catch(() => ({}))); if (!input.success) return c.json({ error: { code: 'BAD_REQUEST', message: '参数不完整' } }, 400); const { audience, maxMinutes, constraints } = input.data; let items = routes.filter((route) => route.audience.includes(audience) || audience === 'other'); if (constraints?.noStairs) items = items.filter((route) => route.stairs === 'no'); if (maxMinutes) items = items.filter((route) => Number(route.duration.split('–')[1]) <= maxMinutes); return c.json(ok({ status: items.length ? 'matched' : 'unmatched', items, appliedContext: input.data, unmatchedReasons: items.length ? [] : ['当前演示数据中没有同时满足全部条件的已核验路线'] })) })
app.post('/api/v1/recommendations/maple', async (c) => { const input = await c.req.json().catch(() => ({})); const interest = input.interest; const active = maple.filter((item) => item.status === '有效').filter((item) => !interest || (interest === 'density' ? item.density.includes('成片') : interest === 'color' ? item.redBand !== '暂无信息' : item.view !== '暂无信息')); return c.json(ok({ items: active.slice(0, 3).map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId), reason: interest === 'density' ? record.density : interest === 'view' ? record.view : record.redBand })) })) })
app.post('/api/v1/chat', async (c) => { const { message = '' } = await c.req.json().catch(() => ({})); const text = String(message).toLowerCase(); const cards = text.includes('厕所') ? facilities.filter((item) => item.kind === 'toilet') : text.includes('路线') || text.includes('老人') ? routes.slice(0, 2) : text.includes('枫') ? maple.slice(0, 3).map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId) })) : pois.slice(0, 2); const answer = text.includes('厕所') ? '入口服务点有厕所记录，开放状态仍需现场核验。' : text.includes('路线') || text.includes('老人') ? '可以先看明镜湖轻行线；它的时间口径含停留与返回段。演示数据不等同于现场导航。' : '我可以帮你查看点位、路线、设施和当前演示枫况。你也可以直接从下方卡片进入。'; return c.json(ok({ answer, cards, citations: ['演示数据：人工整理的结构化样例'], degraded: true })) })
app.post('/api/v1/feedback', async (c) => { const input = await c.req.json().catch(() => ({})); return c.json(ok({ id: crypto.randomUUID(), status: 'pending', message: '感谢反馈，已记录为待处理事项。', received: input.category ?? 'content' }), 201) })
app.post('/api/v1/events', async (c) => c.json(ok({ accepted: true })))
app.get('/api/v1/admin/summary', (c) => c.json(ok({ counts: { pois: pois.length, routes: routes.length, maple: maple.length, facilities: facilities.length }, recent: [{ action: '发布演示数据', at: '2026-10-31 18:00', operator: 'demo-admin' }] })))
app.get('/api/v1/health', (c) => c.json({ ok: true }))

if (process.env.NODE_ENV !== 'test') serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) })
export default app
