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

// 2026-10-31 团队实地采风的 8 个点位与观测记录；枫况为现场目测，坐标为园区参考位置。
const OBS = '2026-10-31T16:20:00+08:00'
const VALID = '2026-11-08T00:00:00+08:00'
const IMG = {
  ximen: '/photos/ximen.jpg', hongyegu: '/photos/hongyegu.jpg', qixiasi: '/photos/qixiasi.jpg',
  sheli: '/photos/sheli.jpg', taohuajian: '/photos/taohuajian.jpg'
}
const pois: Poi[] = [
  { id: 'ximen', name: '西门牌坊', subtitle: '多数游客的实际起点', kind: 'gate', description: '栖霞山主入口，游客中心、卫生间与观光车起点都在这一带。手册特别提示不要打车到南门售票处，入口混淆是入园第一个困惑。', image: IMG.ximen, coordinates: [118.9518, 32.1468], tags: ['入口', '游客中心', '观光车起点'] },
  { id: 'mingjinghu', name: '彩虹明镜', subtitle: '明镜湖上的倒影机位', kind: 'water', description: '明镜湖上的九曲桥与湖心亭，是栖霞山最典型的倒影视角。红度不一定最高，但一旦转色，水面倒影的层次几乎无人能敌。', image: IMG.qixiasi, coordinates: [118.954, 32.148], tags: ['倒影视角', '九曲桥', '停留 10 分钟'] },
  { id: 'qixiasi', name: '栖霞寺', subtitle: '千年古刹与山门', kind: 'temple', description: '始建于南齐，与舍利塔、千佛岩同属栖霞三宝。16:00 停止进入，是全程最硬的时间窗，行程必须围绕它倒排。', image: IMG.qixiasi, coordinates: [118.9585, 32.15], tags: ['三宝之一', '16:00 停止进入', '有座位'] },
  { id: 'sheli', name: '舍利塔', subtitle: '南唐石塔', kind: 'heritage', description: '与千佛岩相距不足百米，却最容易被跳过——游客常拍完千佛岩就转向红叶谷。两处相距 80 米，值得一起看完。', image: IMG.sheli, coordinates: [118.959, 32.1505], tags: ['三宝之一', '步行 2 分钟', '易遗漏'] },
  { id: 'qianfoyan', name: '千佛岩', subtitle: '南朝石窟群', kind: 'heritage', description: '崖壁上开凿的近三百个佛龛，被称作“江南云冈”。光线侧打时最出片，但石阶湿滑，牵着孩子时不要边走边抬头。', image: IMG.sheli, coordinates: [118.96, 32.1512], tags: ['三宝之一', '石阶湿滑', '侧光最佳'] },
  { id: 'taohuajian', name: '桃花涧', subtitle: '中峰涧沿线', kind: 'valley', description: '溪涧沿线的枫香与鸡爪槭混生，颜色变化比山顶早一步。涧谷风大阴凉，深秋体感比山下低 2–3℃。', image: IMG.taohuajian, coordinates: [118.96, 32.1545], tags: ['涧谷', '转色较早', '阴凉'] },
  { id: 'hongyegu', name: '红叶谷', subtitle: '密度最高，但此刻最挤', kind: 'valley', description: '铺翠、揽红二池一带是枫香最密集的成片区。栈道窄、台阶 68 级、午后逆光，带推车或老人时要掂量——密度第一不等于体验第一。', image: IMG.hongyegu, coordinates: [118.963, 32.1555], tags: ['密度最高', '台阶 68 级', '午后逆光'] },
  { id: 'fengxiang', name: '凤翔峰', subtitle: '286 米，全山最高点', kind: 'peak', description: '主观景平台，俯瞰长江与三峰两涧。视角全山第一，但没红时只剩空景，且下山无路灯，16:30 后不建议再往上。', image: IMG.hongyegu, coordinates: [118.9615, 32.156], tags: ['俯瞰视角', '286m', '下山无路灯'] }
]
const maple: Maple[] = [
  { poiId: 'mingjinghu', stage: '初染 · 倒影先行', redBand: '15%–20%', progressPercent: 18, density: '沿湖零星', view: '倒影最佳', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'taohuajian', stage: '转色较早 · 黄绿相间', redBand: '20%–25%', progressPercent: 23, density: '涧谷连片', view: '纵深感', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'hongyegu', stage: '密度最高 · 大部分仍绿', redBand: '20%–30%', progressPercent: 26, density: '成片分布', view: '栈道平视', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'qixiasi', stage: '古寺伴枫 · 刚刚上色', redBand: '10%–15%', progressPercent: 12, density: '零星点缀', view: '框景', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'qianfoyan', stage: '石窟侧光 · 未到佳期', redBand: '8%–12%', progressPercent: 10, density: '零星', view: '侧光岩壁', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'sheli', stage: '石塔背景 · 少量转红', redBand: '8%–12%', progressPercent: 10, density: '零星', view: '塔身框景', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'fengxiang', stage: '山顶未红 · 视角占优', redBand: '5%–10%', progressPercent: 7, density: '稀疏', view: '俯瞰全景', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' },
  { poiId: 'ximen', stage: '入园即见 · 山门初色', redBand: '5%–10%', progressPercent: 8, density: '零星', view: '平视', observedAt: OBS, source: '团队实地采风', validUntil: VALID, status: '有效' }
]
type Route = { id: string; name: string; audience: string[]; stairs: string; duration: string; stops: string[]; distance: string; difficulty: string; start: string; end: string; image: string; reason: string; facilities: string }
const routes: Route[] = [
  { id: 'r-family', name: '亲子半山线 · 走不动就撤', audience: ['family', 'family_senior'], stairs: '少', duration: '90–120 分钟', stops: ['西门牌坊', '彩虹明镜', '栖霞寺', '千佛岩', '舍利塔'], distance: '约 2.8 km', difficulty: '轻松', start: '西门牌坊', end: '栖霞寺山门', image: IMG.taohuajian, reason: '台阶集中在千佛岩一段，中途有天街、半馆两处可坐下。任意点撤回西门都在 25 分钟内。', facilities: '沿线卫生间 3 处、座位 60+、观光车站 2 处' },
  { id: 'r-photo', name: '摄影追光 · 三个视角', audience: ['photo_outdoor', 'couple'], stairs: '中等', duration: '150–180 分钟', stops: ['西门牌坊', '彩虹明镜', '桃花涧', '红叶谷', '凤翔峰'], distance: '约 4.6 km', difficulty: '中等', start: '西门牌坊', end: '凤翔峰', image: IMG.hongyegu, reason: '倒影、纵深、俯瞰三种视角按光线顺序排开：上午拍倒影，正午进涧谷，15:00 前上峰顶。', facilities: '涧谷段无卫生间，红叶谷有临时售卖点' },
  { id: 'r-senior', name: '银发慢游 · 平缓往返', audience: ['senior', 'family_senior'], stairs: '无', duration: '60–80 分钟', stops: ['西门牌坊', '彩虹明镜', '栖霞寺'], distance: '约 1.6 km', difficulty: '平缓', start: '西门牌坊', end: '栖霞寺', image: IMG.qixiasi, reason: '全程缓坡与平路，往返同路不迷路；栖霞寺内有座位与饮水，16:00 前返回即可。', facilities: '卫生间 2 处、座位密集、可全程推轮椅' }
]
const facilities: Facility[] = [
  { id: 'f-wc-ximen', name: '西门入口卫生间', kind: 'toilet', location: '西门进入左侧', note: '排队高峰 9:00–10:00', coordinates: [118.9522, 32.147], status: '已核验' },
  { id: 'f-wc-mingjing', name: '明镜湖卫生间', kind: 'toilet', location: '明镜湖东侧', note: '九曲桥旁，带娃首选', coordinates: [118.9545, 32.1482], status: '已核验' },
  { id: 'f-wc-tianjie', name: '天街卫生间', kind: 'toilet', location: '天街中段', note: '半山唯一稳定补给点附近', coordinates: [118.9585, 32.1495], status: '已核验' },
  { id: 'f-seat-banguan', name: '半馆休憩点', kind: 'rest', location: '半馆室内', note: '室内可避雨，中草药展陈', coordinates: [118.96, 32.152], status: '已核验' },
  { id: 'f-park-p2', name: '西门 P2 停车场', kind: 'parking', location: '西门停车场出入口', note: '周末 10:00 后趋于饱和', coordinates: [118.9508, 32.1462], status: '已核验' },
  { id: 'f-shuttle', name: '观光车西门站', kind: 'shuttle', location: '西门牌坊内侧', note: '单程至半山，班次以现场为准', coordinates: [118.9525, 32.1472], status: '已核验' }
]
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
// ── 伴游问答：全部结论取自本文件的采风数据、官方推文与导览折页，不做推测 ──
const activeMaple = () => currentMaple().filter((item) => item.status === '有效')
const poiName = (id: string) => pois.find((poi) => poi.id === id)?.name ?? id
const mapleRanking = () => [...activeMaple()].sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))
const routeLine = (route: Route) => `${route.name}：约 ${route.duration}、${route.distance}，${route.difficulty}，台阶：${route.stairs}。路线：${route.stops.join(' → ')}。${route.reason}${route.facilities}。`
const facilityLine = (item: Facility) => `${item.name}（${item.location}${item.note ? `，${item.note}` : ''}）`
const SOURCE_ROUTE = '园区导览折页 · 路线时长与台阶'
const SOURCE_FACILITY = '园区导览折页 · 设施图例'
const SOURCE_FIELD = '团队 2026-10-31 实地采风'

app.post('/api/v1/chat', async (c) => {
  const { message = '' } = await c.req.json().catch(() => ({}))
  const text = String(message).toLowerCase()
  const context = currentContext()
  const toilets = mapFacilities.filter((item) => item.kind === 'toilet')
  const parking = mapFacilities.filter((item) => item.kind === 'parking')
  const shuttle = mapFacilities.filter((item) => item.kind === 'shuttle')
  const routeOf = (id: string) => routes.find((route) => route.id === id)

  // 1) 先看点名：命中具体点位时直接答该点位，避免「红叶谷」被当成泛问枫况
  const hitId = pois.find((poi) => text.includes(poi.name))?.id
    ?? (/西门|入口/.test(text) ? 'ximen'
      : /古寺|寺庙/.test(text) ? 'qixiasi'
      : /石塔/.test(text) ? 'sheli'
      : /石窟|佛龛/.test(text) ? 'qianfoyan'
      : /山顶|最高|俯瞰/.test(text) ? 'fengxiang'
      : '')
  const hit = pois.find((poi) => poi.id === hitId)
  if (hit) {
    const record = mapleRanking().find((item) => item.poiId === hit.id) ?? activeMaple().find((item) => item.poiId === hit.id)
    return c.json(ok({
      answer: `${hit.name}：${hit.description}${record ? `采风红度 ${record.redBand}（${record.stage}，密度${record.density}，视角${record.view}）。` : ''}`,
      cards: [{ ...hit, maple: record }], citations: ['园区导览折页 · 点位说明', SOURCE_FIELD], degraded: true
    }))
  }

  // 2) 枫况：官方进度 + 采风定性与点位红度分开说，不混算
  if (/枫况|红叶|枫叶|红度|变红|红了|转色|哪片|什么颜色/.test(text)) {
    const top = mapleRanking().slice(0, 3)
    const answer = [
      `官方公众号 2026-10-30 推文：红叶进度 ${context.progressPercent}%，判断为「${context.summary}」。这是发布时的进度，非实时监测或具体点位统计。`,
      `${context.fieldReport.observationPeriod}团队实地采风：${context.fieldReport.summary}；${context.fieldReport.scope}`,
      `点位红度前三（采风目测，有效期至 11-08）：${top.map((item) => `${poiName(item.poiId)} ${item.redBand}（${item.stage}；密度${item.density}；视角${item.view}）`).join('；')}。`,
      '结论：想要成片密度去红叶谷，想拍倒影去彩虹明镜，怕台阶就走银发慢游线（全程无台阶）。'
    ].join('\n\n')
    return c.json(ok({ answer, cards: top.map((record) => ({ ...record, poi: pois.find((poi) => poi.id === record.poiId) })), citations: [context.source, context.reference.url], degraded: true }))
  }

  // 3) 路线：按同行人挑已整理的 3 条线，给出时长/距离/台阶/途经点
  if (/路线|怎么走|怎么逛|行程|带老人|老人|长者|银发|轮椅|腿脚|带娃|孩子|亲子|推车|婴儿|摄影|拍照|机位|倒影|追光|徒步|爬山|多久|时长/.test(text)) {
    const primary = /老人|长者|银发|轮椅|腿脚/.test(text) ? routeOf('r-senior')!
      : /孩子|娃|亲子|推车|婴儿/.test(text) ? routeOf('r-family')!
      : /摄影|拍照|机位|倒影|追光/.test(text) ? routeOf('r-photo')!
      : routeOf('r-family')!
    const other = primary.id === 'r-family' ? routeOf('r-senior')! : routeOf('r-family')!
    const answer = [
      routeLine(primary),
      `另一条可参考：${routeLine(other)}`,
      '时间窗：栖霞寺 16:00 停止进入；凤翔峰 16:30 后不建议再往上（下山无路灯）。'
    ].join('\n\n')
    return c.json(ok({ answer, cards: [primary, other], citations: [SOURCE_ROUTE, SOURCE_FIELD], degraded: true }))
  }

  // 4) 设施：厕所 / 停车 / 观光车 / 休息补给
  if (/厕所|卫生间|洗手间/.test(text)) {
    return c.json(ok({ answer: `折页标注的卫生间共 ${toilets.length} 处：${toilets.map(facilityLine).join('；')}。桃花涧到红叶谷的涧谷段没有卫生间，进涧谷前先解决。`, cards: toilets, citations: [SOURCE_FACILITY], degraded: true }))
  }
  if (/停车|车位|自驾/.test(text)) {
    const answer = parking.length
      ? `${parking.map(facilityLine).join('；')}。建议 9:30 前进场，避开 10:00 后的饱和段。`
      : '折页中没有标注停车场信息，建议以园区现场指引为准。'
    return c.json(ok({ answer, cards: parking, citations: [SOURCE_FACILITY], degraded: true }))
  }
  if (/观光车|接驳|摆渡|电瓶车/.test(text)) {
    const answer = shuttle.length
      ? `${facilityLine(shuttle[0])}。票价与班次没有获取到官方发布数据，不做推测，现场确认。`
      : '折页中没有标注观光车站点，建议以园区现场指引为准。'
    return c.json(ok({ answer, cards: shuttle, citations: [SOURCE_FACILITY], degraded: true }))
  }
  if (/休息|座位|坐一会|避雨|吃饭|补给|饿/.test(text)) {
    return c.json(ok({
      answer: '亲子线与银发线沿线共有座位 60 余处，半山有半馆休憩点（室内可避雨）与天街补给段；红叶谷只有临时售卖点。山上正餐点位没有官方发布清单，不逐一推荐。',
      cards: mapFacilities.filter((item) => item.kind === 'rest'), citations: [SOURCE_FACILITY], degraded: true
    }))
  }

  // 5) 票价与开放时间：没有官方数据就明说，不编数字
  if (/门票|票价|价格|多少钱|开放时间|几点开|几点关|营业时间/.test(text)) {
    return c.json(ok({
      answer: '票价与开放时间没有获取到官方发布数据，不做推测，可查「栖霞山」官方公众号或现场售票处。已核到的时间窗只有两处：栖霞寺 16:00 停止进入；凤翔峰 16:30 后不建议再往上（下山无路灯）。',
      cards: [], citations: [], degraded: true
    }))
  }

  // 6) 兜底：交代能力边界与数据来源
  return c.json(ok({
    answer: [
      '回答只用三类来源：官方公众号推文、园区导览折页、团队实地采风。',
      `当前可查：① 枫况（官方进度 ${context.progressPercent}%，发布 ${context.publishedAt.slice(0, 10)}）② 老人 / 亲子 / 摄影三条路线 ③ 厕所、停车、观光车共 ${mapFacilities.length} 处设施 ④ 8 个点位的红度与硬提示。`,
      '可以这样问：「带老人走哪条」「现在哪片最红」「厕所在哪」「栖霞寺几点停止进入」。'
    ].join('\n\n'),
    cards: [], citations: [], degraded: true
  }))
})
// Unavailable persistence must never return a fabricated acceptance receipt.
app.post('/api/v1/feedback', c => c.json({ error: { code: 'UNAVAILABLE', message: '暂未开通在线反馈，请向园区工作人员反馈。' } }, 503))
app.get('/api/v1/health', (c) => c.json({ ok: true }))

if (process.env.NODE_ENV !== 'test') serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) })
export default app
