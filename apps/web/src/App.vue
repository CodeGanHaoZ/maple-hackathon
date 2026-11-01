<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Map, Leaf, ArrowUp, ArrowRight, LocateFixed, Clock3, MapPin, Mountain, Send, RefreshCw, X, ExternalLink, ShieldCheck, Info, AlertTriangle, Flower2, Sun, Snowflake, Landmark, BookOpen, Trees } from 'lucide-vue-next'
import ScenicMap from './components/ScenicMap.vue'
import ScenicIcon from './components/ScenicIcon.vue'
import LeafProgress from './components/LeafProgress.vue'
import SeasonSidebar from './components/SeasonSidebar.vue'
import { seasonAt, autumnTone, leafColor, type Season } from './phenology'
import { vReveal, vImageFade } from './motion'

type Poi = { id: string; name: string; subtitle: string; description: string; image: string; tags: string[]; coordinates: [number, number] }
type Maple = { poiId: string; stage: string; redBand: string; progressPercent: number | null; density: string; view: string; observedAt: string; source: string; validUntil: string; status: string; poi?: Poi }
type Route = { id: string; name: string; duration: string; distance: string; audience: string[]; difficulty: string; stairs: string; start: string; end: string; image: string; stops: string[]; reason: string; facilities: string }
type Facility = { id: string; name: string; kind: string; location: string; note: string; status: string; coordinates: [number, number] }
type ShuttleRoute = { id: string; name: string; coordinates: [number, number][]; operatingNote: string }
type FoliageContext = { publishedAt: string; summary: string; source: string; reference: { label: string; url: string }; scope: string; progressPercent: number | null; fieldReport: { observationPeriod: string; summary: string; source: string; scope: string } }
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1'
const nav = ref('maple')
const seasonOptions = [
  { id: 'spring' as Season, label: '春·新绿', icon: Flower2, kicker: 'SPRING · SEASON STATUS', headline: '春季山林', description: '新叶与花期信息以现场观测和园区公告为准。', leafStage: '新叶青绿', leafNote: '春季显示自然观察；枫红比例不适用于本季。', features: ['自然观察', '地图服务', '出行问答'] },
  { id: 'summer' as Season, label: '夏·浓荫', icon: Sun, kicker: 'SUMMER · SEASON STATUS', headline: '夏日林荫', description: '天气、开放范围与道路信息出发前请以园区公告为准。', leafStage: '浓绿生长', leafNote: '夏季显示林荫与自然体验信息；枫红比例不适用于本季。', features: ['林荫游览', '地图服务', '出行问答'] },
  { id: 'autumn' as Season, label: '秋·枫染', icon: Leaf, kicker: 'AUTUMN · FIELD STATUS', headline: '秋季枫况', description: '优先查看有日期、点位与来源的现场观测。', leafStage: '绿黄渐染', leafNote: '红度比例仅在点位、统计范围、观测时间和来源齐备时发布。', features: ['现场观测', '地图服务', '出行问答'] },
  { id: 'winter' as Season, label: '冬·山静', icon: Snowflake, kicker: 'WINTER · SEASON STATUS', headline: '冬日游览', description: '开放范围、结冰与交通信息以园区当日公告为准。', leafStage: '落叶休眠', leafNote: '冬季不显示枫红比例；请优先查看道路与运营公告。', features: ['道路信息', '地图服务', '出行问答'] }
]
const now = ref(Date.now())
const season = computed(() => seasonAt(now.value))
const theme = computed(() => seasonOptions.find(item => item.id === season.value)!)
function readPreference(storage: 'localStorage' | 'sessionStorage', key: string) {
  try { return window[storage].getItem(key) } catch { return null }
}
function savePreference(storage: 'localStorage' | 'sessionStorage', key: string, value: string | null) {
  try { if (value === null) window[storage].removeItem(key); else window[storage].setItem(key, value) } catch { /* Storage may be disabled; keep the in-memory selection. */ }
}
const savedTheme = readPreference('localStorage', 'qixia-color-season')
const previewSeason = ref<Season | null>(seasonOptions.some(item => item.id === savedTheme) ? savedTheme as Season : null)
const themeSeason = computed(() => previewSeason.value ?? season.value)
watch(themeSeason, value => { document.documentElement.dataset.season = value }, { immediate: true })
watch(previewSeason, value => {
  savePreference('localStorage', 'qixia-color-season', value)
})
const snapshotOpen = ref(false)
const localYear = computed(() => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(now.value))
const localDate = computed(() => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(now.value))
const archiveOpen = ref(false)
const selectedTopic = ref<string | null>(null)
const cultureTopics = [
  { id: 'heritage', title: '山寺与遗迹', subtitle: '读懂一座山的时间', icon: Landmark, description: '以千佛岩、舍利塔等人文线索建立景点档案。首版先展示主题入口，历史年代、开放范围与讲解稿待景区审核后发布。', status: '讲解内容待核验' },
  { id: 'tea', title: '陆羽与茶文化', subtitle: '让停留多一种理由', icon: BookOpen, description: '围绕陆羽茶文化与茶庄体验补充四季内容。活动、地点、预约和收费信息须经运营方核验后上线，当前不提供虚构预约。', status: '体验信息待核验' },
  { id: 'nature', title: '四季山林', subtitle: '从一片叶，到一座山', icon: Trees, description: '用四季自然观察、湖岸与林下慢行补足全年体验。花期、天气、道路通行与设施状态需持续更新，首版保留地图与服务入口。', status: '自然主题策划' }
]
const topic = computed(() => cultureTopics.find(item => item.id === selectedTopic.value))
const storedAudience = readPreference('sessionStorage', 'maple-audience')
const audience = ref(storedAudience && ['photo_outdoor', 'couple', 'family', 'family_senior', 'senior', 'other'].includes(storedAudience) ? storedAudience : 'other')
const interest = ref<string | null>(null)
const pois = ref<Poi[]>([])
// 2026-10-31 团队实拍照片（仅用于点位与路线封面）
const PHOTOS: Record<string, string> = { ximen: '/photos/ximen.jpg', mingjinghu: '/photos/qixiasi.jpg', qixiasi: '/photos/qixiasi.jpg', sheli: '/photos/sheli.jpg', qianfoyan: '/photos/sheli.jpg', taohuajian: '/photos/taohuajian.jpg', hongyegu: '/photos/hongyegu.jpg' }
const ROUTE_PHOTOS: Record<string, string> = { 'r-family': '/photos/taohuajian.jpg', 'r-photo': '/photos/hongyegu.jpg', 'r-senior': '/photos/qixiasi.jpg' }
const withPhotos = (list: any[]) => list.map(item => PHOTOS[item?.poi?.id] ? { ...item, poi: { ...item.poi, image: PHOTOS[item.poi.id] } } : PHOTOS[item?.id] ? { ...item, image: PHOTOS[item.id] } : item)
const maple = ref<Maple[]>([])
const routes = ref<Route[]>([])
const facilities = ref<Facility[]>([])
const shuttleRoutes = ref<ShuttleRoute[]>([])
const foliageContext = ref<FoliageContext | null>(null)
const scenicMap = ref<InstanceType<typeof ScenicMap>>()
const selectedPoi = ref<Poi | null>(null)
const selectedMaple = ref<Maple | null>(null)
const selectedRoute = ref<Route | null>(null)
const chatOpen = ref(false)
const message = ref('')
const messages = ref([{ role: 'assistant', text: '你好，我是栖霞山伴游。可以问我点位、路线、厕所或当前枫况。' }])
const loading = ref(false)
const toast = ref('')
const dataLoading = ref(true)
const dataError = ref(false)
const hasData = ref(false)
const showBackTop = ref(false)
let clockTimer: ReturnType<typeof setInterval> | undefined
let refreshTimer: ReturnType<typeof setInterval> | undefined
let loadController: AbortController | undefined
let disposed = false
async function api(path: string, options?: RequestInit) { const res = await fetch(`${API}${path}`, { headers: { 'content-type': 'application/json' }, ...options }); if (!res.ok) throw new Error('请求失败'); return (await res.json()).data }
async function load() {
  if (loadController) return
  const controller = new AbortController()
  loadController = controller
  dataLoading.value = !hasData.value
  dataError.value = false
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const [p, m, r, f, mapData, foliage] = await Promise.all(['/pois', '/maple', '/routes', '/facilities', '/map', '/foliage-context'].map(path => api(path, { signal: controller.signal })))
    if (disposed) return
    pois.value = withPhotos(p); maple.value = withPhotos(m).map((rec: any) => ({ ...rec, poi: rec.poi ? { ...rec.poi, image: PHOTOS[rec.poi.id] ?? rec.poi.image } : rec.poi }))
    routes.value = withPhotos(r).map((route: any) => ({ ...route, image: ROUTE_PHOTOS[route.id] ?? route.image })); facilities.value = f; shuttleRoutes.value = mapData.shuttleRoutes ?? []
    foliageContext.value = foliage
    hasData.value = true
    now.value = Date.now()
  } catch (err) {
    // 部署环境容错：任一接口异常也让页面骨架可用，避免整页落到错误态
    if (!disposed) {
      dataError.value = true
      now.value = Date.now()
      console.warn('[maple] 数据加载不完整', err)
    }
  }
  finally { clearTimeout(timeout); loadController = undefined; if (!disposed) dataLoading.value = false }
}
function updateScroll() { showBackTop.value = window.scrollY > 320 }
function backToTop() { window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
function resume() { if (!document.hidden) { now.value = Date.now(); void load() } }
onMounted(() => {
  void load()
  clockTimer = setInterval(() => { now.value = Date.now() }, 30000)
  refreshTimer = setInterval(() => { if (!document.hidden) void load() }, 300000)
  window.addEventListener('scroll', updateScroll, { passive: true })
  document.addEventListener('visibilitychange', resume)
  updateScroll()
})
onBeforeUnmount(() => {
  disposed = true; loadController?.abort()
  clearInterval(clockTimer); clearInterval(refreshTimer)
  window.removeEventListener('scroll', updateScroll)
  document.removeEventListener('visibilitychange', resume)
})
function isCurrent(record: Maple) { return record.status === '有效' && Date.parse(record.validUntil) >= now.value }
function redPercent(record: Maple) { return isCurrent(record) && record.progressPercent !== null && Number.isFinite(record.progressPercent) ? Math.max(0, Math.min(100, record.progressPercent)) : null }
const activeMaple = computed(() => maple.value.filter(isCurrent))
const officialPercent = computed(() => {
  const value = foliageContext.value?.progressPercent
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
})
// 发布快照保留原值；仅 7 天内的秋季发布参与当前主题联动。
const recentBulletin = computed(() => {
  const age = now.value - Date.parse(foliageContext.value?.publishedAt ?? '')
  return season.value === 'autumn' && age >= 0 && age <= 7 * 86400000
})
const foliageTone = computed(() => autumnTone(recentBulletin.value ? officialPercent.value : null))
const autumnStyle = computed(() => themeSeason.value === 'autumn' && recentBulletin.value ? { '--foliage-accent': leafColor(officialPercent.value, true) } : {})
const publicationDate = computed(() => foliageContext.value?.publishedAt.slice(0, 10) ?? '')
const displayMaple = computed(() => season.value === 'autumn' ? recommendedMaple.value : archiveOpen.value ? maple.value : [])
const recommendedRoutes = computed(() => routes.value.filter((route) => route.audience.includes(audience.value) || audience.value === 'other').slice(0, 3))
const recommendedMaple = computed(() => activeMaple.value.filter((record) => !interest.value || (interest.value === 'density' ? record.density.includes('成片') : interest.value === 'color' ? record.redBand !== '暂无信息' : record.view !== '暂无信息')).slice(0, 3))
const audienceLabels: Record<string, string> = { photo_outdoor: '摄影户外', couple: '情侣同行', family: '亲子同行', family_senior: '亲子带老人', senior: '银发慢行', other: '先看看' }
const interestLabels: Record<string, string> = { color: '看色彩', density: '看成片', view: '看层次' }
function selectNav(key: string) { nav.value = key; selectedPoi.value = null; selectedRoute.value = null; selectedMaple.value = null; selectedTopic.value = null; backToTop() }
function showPoi(poi: Poi) { closeDetail(); selectedPoi.value = poi; selectedMaple.value = maple.value.find((item) => item.poiId === poi.id) ?? null; nav.value = 'map' }
function showRoute(route: Route) { closeDetail(); selectedRoute.value = route; nav.value = 'map' }
function showMaple(record: Maple) { closeDetail(); selectedMaple.value = record; selectedPoi.value = record.poi ?? pois.value.find((poi) => poi.id === record.poiId) ?? null; nav.value = 'maple' }
async function sendMessage() { if (!message.value.trim() || loading.value) return; const current = message.value.trim(); messages.value.push({ role: 'user', text: current }); message.value = ''; loading.value = true; try { const data = await api('/chat', { method: 'POST', body: JSON.stringify({ message: current }) }); messages.value.push({ role: 'assistant', text: data.answer }); } catch { messages.value.push({ role: 'assistant', text: '当前连接不可用，你仍可以使用地图和枫况列表。' }) } finally { loading.value = false } }
function chooseAudience(key: string) { audience.value = key; savePreference('sessionStorage', 'maple-audience', key); toast.value = `已按“${audienceLabels[key]}”更新路线` }
function closeDetail() { selectedPoi.value = null; selectedRoute.value = null; selectedMaple.value = null; selectedTopic.value = null }
</script>

<template>
  <div class="app-shell paper-grain" :data-season="themeSeason" :data-foliage="foliageTone" :style="autumnStyle">
    <header class="topbar">
      <button class="brand" aria-label="返回栖霞游鉴助手首页" @click="selectNav('maple')"><img src="/assets/qixia-mark.png" alt="栖霞山" /><span><b>栖霞游鉴助手</b><small>QIXIA GUIDE</small></span></button>
      <div class="topbar-note"><span class="kicker">FOUR SEASONS · {{ localYear }}</span><span>四季游览服务</span></div>
    </header>


    <main :aria-busy="dataLoading">
      <Transition name="page" mode="out-in">
        <div v-if="dataLoading" key="loading" class="loading-page" role="status"><ScenicIcon :size="40" class="loading-leaf" /><span>正在加载景点与服务数据…</span><div class="skeleton-grid" aria-hidden="true"><div v-for="i in 3" :key="i" class="skeleton-card"><div /><span /><span /><span /></div></div></div>
        <div v-else-if="!hasData" key="error" class="load-error"><ScenicIcon :size="40" /><h2>暂时无法连接服务</h2><p>请检查网络后重新加载景点与枫况数据。</p><button class="outline-btn" @click="load"><RefreshCw :size="17" />重新加载</button></div>
        <div v-else :key="nav" class="page-view">
          <div v-if="dataError" class="refresh-error" role="status">数据更新失败，当前显示上次成功加载的内容。<button class="text-btn" @click="load">重试</button></div>
      <section v-if="nav === 'maple'" class="foliage-overview">
        <div class="foliage-heading"><h1>{{ season === 'autumn' ? '栖霞枫况' : theme.headline }}</h1><span><Clock3 :size="13" />{{ localDate }} · 南京</span></div>
        <article v-if="season === 'autumn' || snapshotOpen" class="official-foliage-card">
          <div class="bulletin-heading"><h2>红叶进度</h2><span class="source-badge">{{ recentBulletin ? '官方发布' : '历史发布' }}</span></div>
          <div class="foliage-reading-layout">
            <LeafProgress :percent="officialPercent" label="栖霞山官方发布" metric="红叶进度" attribution="官方发布" />
            <div class="foliage-context"><h3>{{ foliageContext?.summary || '等待官方信息更新' }}</h3><p>发布于 {{ publicationDate }}<br />{{ foliageContext?.scope }}</p><p v-if="foliageContext?.fieldReport" class="bulletin-field-note"><b>{{ foliageContext.fieldReport.observationPeriod }} · 实地采风</b><br />{{ foliageContext.fieldReport.summary }}。{{ foliageContext.fieldReport.scope }}</p><a v-if="foliageContext" :href="foliageContext.reference.url" target="_blank" rel="noopener noreferrer"><ExternalLink :size="14" />查看官方枫情预报</a><small v-if="!recentBulletin">这是一条历史发布记录，不代表当前枫况。</small></div>
          </div>
          <div v-if="foliageContext?.fieldReport" class="field-observation"><ScenicIcon :size="21" filled /><div><b>以绿为主，少量微黄</b><p>{{ foliageContext.fieldReport.observationPeriod }} · 采风观察，未按点位统计</p></div></div>
        </article>
        <article v-else class="current-season-card"><component :is="theme.icon" :size="36" /><div><h2>{{ theme.leafStage }}</h2><p>{{ theme.description }}</p></div><button class="text-btn" @click="snapshotOpen = true">查看秋季发布记录<ArrowRight :size="15" /></button></article>
        <div class="foliage-quick-actions"><button class="primary-btn" @click="selectNav('map')"><Map :size="17" />查看地图与设施</button><button class="outline-btn" @click="selectNav('chat')"><Send :size="16" />询问枫况</button></div>
      </section>
      <section v-if="nav === 'map'" class="content-section map-page paper-wash">
        <div class="map-page-heading"><h2>地图服务</h2></div>
        <div class="map-layout" :class="{ 'without-routes': !recommendedRoutes.length }"><ScenicMap ref="scenicMap" :pois="pois" :facilities="facilities" :shuttle-routes="shuttleRoutes" @select-poi="id => { const poi = pois.find(item => item.id === id); if (poi) showPoi(poi) }" @notice="value => toast = value"><template #map-controls><div class="toolbar map-controls-below"><div class="segmented" role="tablist" aria-label="路线偏好"><button v-for="(label, key) in audienceLabels" :key="key" role="tab" :aria-selected="audience === key" :class="{ active: audience === key }" @click="chooseAudience(key)">{{ label }}</button></div><div class="toolbar-actions"><button class="outline-btn" @click="scenicMap?.reset()"><MapPin :size="17" />回到栖霞山</button><button class="outline-btn" @click="scenicMap?.locate()"><LocateFixed :size="17" />使用我的位置</button></div></div></template></ScenicMap><div v-if="recommendedRoutes.length" class="route-list"><div class="list-heading"><span>已核验路线</span><small>{{ recommendedRoutes.length }} 条 · {{ audienceLabels[audience] }}</small></div><article v-for="route in recommendedRoutes" :key="route.id" class="route-ticket" v-reveal tabindex="0" role="button" :aria-label="`查看${route.name}详情`" @click="showRoute(route)" @keydown.enter="showRoute(route)" @keydown.space.prevent="showRoute(route)"><img v-image-fade :src="route.image" alt="" /><div class="ticket-content"><span class="ticket-kicker">ROUTE</span><h3>{{ route.name }}</h3><div class="route-meta"><span><Clock3 :size="14" />{{ route.duration }}</span><span><Mountain :size="14" />{{ route.difficulty }}</span></div><p>{{ route.reason }}</p><button class="text-btn">查看路线详情 <ArrowRight :size="15" /></button></div></article><div v-if="!recommendedRoutes.length" class="empty-state"><AlertTriangle :size="20" /><b>暂无已核验路线</b><span>可切换园区导览图查阅图面信息，出行前向园区确认现场路况。</span></div></div></div>
      </section>

      <section v-if="nav === 'maple'" class="content-section maple-section">
        <div class="section-heading compact"><span class="kicker">MAPLE CONDITION</span><h2>枫况记录</h2></div>
        <div class="leaf-stage-guide"><span><ScenicIcon class="leaf-green" :size="22" filled />青绿生长</span><span><ScenicIcon class="leaf-yellow" :size="22" filled />黄绿渐染</span><span><ScenicIcon class="leaf-red" :size="22" filled />红叶渐盛</span><small>叶色示意，不作转红日期预测</small></div>
        <button v-if="season !== 'autumn' && maple.length" class="outline-btn archive-toggle" :aria-expanded="archiveOpen" @click="archiveOpen = !archiveOpen"><ScenicIcon :size="20" />{{ archiveOpen ? '收起秋季档案' : '查看秋季记录' }}</button><div v-if="season === 'autumn' && maple.length" class="interest-bar"><span>你更想看</span><button v-for="(label, key) in interestLabels" :key="key" :class="{ active: interest === key }" @click="interest = interest === key ? null : key">{{ label }}</button><small>可跳过</small></div>
        <TransitionGroup name="cards" tag="div" class="maple-grid"><article v-for="record in displayMaple" :key="record.poiId" class="maple-card" v-reveal tabindex="0" role="button" :aria-label="`查看${record.poi?.name}枫况详情`" @click="showMaple(record)" @keydown.enter="showMaple(record)" @keydown.space.prevent="showMaple(record)"><div class="maple-image"><img v-image-fade :src="record.poi?.image" alt="" /><span class="status-stamp" :class="{ stale: !isCurrent(record) }">{{ season === 'autumn' && isCurrent(record) ? '有效观测' : '秋季档案' }}</span></div><div class="maple-body"><span class="kicker">{{ record.poi?.name }}</span><h3>{{ record.stage }}</h3><p>{{ record.density }} · {{ record.view }}</p><LeafProgress v-if="season === 'autumn'" :percent="redPercent(record)" :label="record.poi?.name || '点位'" compact /><p v-else class="archive-note">秋季留影，当前不作红度判断</p><div class="maple-facts"><span><b>观测区间</b>{{ record.redBand }}</span><span><b>观察日期</b>{{ record.observedAt }}</span></div><small>{{ record.source }} · 有效至 {{ record.validUntil.slice(0, 10) }}</small></div></article></TransitionGroup>
        <div v-if="season === 'autumn' && !recommendedMaple.length" class="empty-state"><Leaf :size="24" /><b>暂无按点位核验的枫况记录</b><span>官方发布进度见上方记录。各景点的红叶占比尚未统计，后续按观测更新。</span></div>
        <div class="coverage-note"><Info :size="18" /><span>官方进度与点位红叶占比口径不同；请结合发布日期和现场叶色查看。</span></div>
      </section>

      <section v-if="nav === 'maple'" class="culture-section"><div class="section-heading"><span class="kicker">VISIT INFORMATION</span><h2>游览内容</h2></div><div class="culture-grid"><button v-for="item in cultureTopics" :key="item.id" class="culture-card" v-reveal @click="selectedTopic = item.id"><component :is="item.icon" :size="22" /><span class="culture-copy"><h3>{{ item.title }}</h3><small>{{ item.status }}</small></span><ArrowRight :size="18" /></button></div></section>

      <section v-if="nav === 'chat'" class="content-section chat-page"><div class="section-heading compact"><span class="kicker">TEXT COMPANION</span><h2>问一句，先把选择变清楚。</h2><p>伴游依据已发布的结构化信息回答，缺少核验资料时会明确说明。</p></div><div class="chat-panel"><TransitionGroup name="messages" tag="div" class="chat-messages"><div v-for="(item, index) in messages" :key="index" class="chat-line" :class="item.role"><span v-if="item.role === 'assistant'" class="chat-mark"><ScenicIcon :size="19" /></span><p>{{ item.text }}</p></div><div v-if="loading" key="typing" class="chat-line assistant typing"><span class="chat-mark"><RefreshCw :size="14" /></span><p>正在整理信息<span class="typing-dots">…</span></p></div></TransitionGroup><form class="chat-input" @submit.prevent="sendMessage"><input v-model="message" aria-label="输入问题" placeholder="例如：带老人，想了解路线和设施" maxlength="500" /><button class="primary-btn" type="submit" aria-label="发送"><Send :size="18" /></button></form><div class="chat-suggestions"><button @click="message = '带老人，推荐一条路线'">带老人，推荐路线</button><button @click="message = '哪里有厕所？'">哪里有厕所？</button><button @click="message = '现在枫况怎样？'">现在枫况怎样？</button></div></div></section>


      </div></Transition>
      <Transition name="drawer"><section v-if="selectedPoi || selectedRoute || selectedMaple || topic" class="detail-drawer"><button class="drawer-close" aria-label="关闭详情" @click="closeDetail"><X :size="18" /></button><template v-if="topic"><span class="kicker">QIXIA CULTURE NOTES</span><h2>{{ topic.title }}</h2><p class="drawer-subtitle">{{ topic.subtitle }}</p><p>{{ topic.description }}</p><div class="info-callout"><ShieldCheck :size="18" />{{ topic.status }}</div><button class="outline-btn" @click="selectNav('map')">先看地图与服务 <Map :size="16" /></button></template><template v-else-if="selectedRoute"><img v-image-fade :src="selectedRoute.image" alt="" class="drawer-image" /><span class="kicker">ROUTE DETAIL</span><h2>{{ selectedRoute.name }}</h2><div class="detail-stats"><span><Clock3 :size="16" />{{ selectedRoute.duration }}</span><span><MapPin :size="16" />{{ selectedRoute.distance }}</span><span><Mountain :size="16" />{{ selectedRoute.difficulty }}</span></div><p>{{ selectedRoute.reason }}</p><h4>路段顺序</h4><div class="stop-line"><span v-for="(stop, i) in selectedRoute.stops" :key="stop"><b>{{ i + 1 }}</b>{{ stop }}</span></div><div class="info-callout"><ShieldCheck :size="18" />{{ selectedRoute.facilities }}</div></template><template v-else-if="selectedPoi"><img v-image-fade :src="selectedPoi.image" alt="" class="drawer-image" /><span class="kicker">POINT OF INTEREST</span><h2>{{ selectedPoi.name }}</h2><p class="drawer-subtitle">{{ selectedPoi.subtitle }}</p><p>{{ selectedPoi.description }}</p><div class="tag-row"><span v-for="tag in selectedPoi.tags" :key="tag">{{ tag }}</span></div><div v-if="selectedMaple" class="maple-detail"><h4>枫况观测 · {{ isCurrent(selectedMaple) ? '有效' : '历史记录' }}</h4><LeafProgress v-if="season === 'autumn'" :percent="redPercent(selectedMaple)" :label="selectedPoi.name" /><p v-else class="archive-note">秋季档案，不代表当前季节状态。</p><div class="detail-stats"><span><b>红度</b>{{ selectedMaple.redBand }}</span><span><b>密度</b>{{ selectedMaple.density }}</span><span><b>视角</b>{{ selectedMaple.view }}</span></div><small>{{ selectedMaple.observedAt }} · {{ selectedMaple.source }} · 有效至 {{ selectedMaple.validUntil.slice(0, 10) }}</small></div><button class="outline-btn" @click="selectNav('map')">查看关联路线 <ExternalLink :size="16" /></button></template></section></Transition>
    </main>
    <SeasonSidebar v-model="previewSeason" :season="season" :options="seasonOptions" />

    <footer class="mountain-footer"><div class="footer-inner"><div class="footer-brand"><img src="/assets/qixia-mark.png" alt="栖霞山" /><div><b>栖霞游鉴助手</b><span>枫况记录 · 地图服务 · 游览信息</span></div></div></div><img class="hills" src="/assets/hills.svg" alt="" /></footer>
    <nav class="bottom-nav" aria-label="主要功能"><button :class="{ active: nav === 'maple' }" :aria-current="nav === 'maple' ? 'page' : undefined" @click="selectNav('maple')"><ScenicIcon :size="29" :filled="nav === 'maple'" /><span>枫况</span></button><button :class="{ active: nav === 'map' }" :aria-current="nav === 'map' ? 'page' : undefined" @click="selectNav('map')"><ScenicIcon kind="pagoda" :size="29" /><span>地图服务</span></button><button :class="{ active: nav === 'chat' }" :aria-current="nav === 'chat' ? 'page' : undefined" @click="selectNav('chat')"><ScenicIcon kind="guide" :size="29" /><span>问伴游</span></button></nav>
    <Transition name="float"><button v-if="showBackTop" class="back-to-top" aria-label="返回顶部" @click="backToTop"><ArrowUp :size="20" /><span>顶部</span></button></Transition>
    <button class="floating-chat" aria-label="打开伴游" @click="chatOpen = !chatOpen"><ScenicIcon kind="guide" :size="27" /></button>
    <Transition name="float"><div v-if="chatOpen" class="mini-chat"><button class="mini-close" aria-label="关闭" @click="chatOpen = false"><X :size="16" /></button><b>问伴游</b><p>想问路线、点位还是厕所？</p><button class="primary-btn" @click="chatOpen = false; selectNav('chat')">打开文字伴游 <ArrowRight :size="16" /></button></div></Transition>
    <Transition name="fade"><div v-if="toast" class="toast" role="status"><Info :size="16" />{{ toast }}<button aria-label="关闭提示" @click="toast = ''"><X :size="15" /></button></div></Transition>
  </div>
</template>
