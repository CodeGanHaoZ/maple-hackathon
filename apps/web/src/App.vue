<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Map, Leaf, ArrowUp, ArrowRight, LocateFixed, Clock3, MapPin, Mountain, Send, RefreshCw, X, ExternalLink, ShieldCheck, Info, CheckCircle2, AlertTriangle, Flower2, Sun, Snowflake, Landmark, BookOpen, Trees } from 'lucide-vue-next'
import ScenicMap from './components/ScenicMap.vue'
import ScenicIcon from './components/ScenicIcon.vue'
import LeafProgress from './components/LeafProgress.vue'
import { seasonAt, autumnTone, leafColor, leafCaption, type Season } from './phenology'
import { vReveal, vImageFade } from './motion'

type Poi = { id: string; name: string; subtitle: string; description: string; image: string; tags: string[]; coordinates: [number, number] }
type Maple = { poiId: string; stage: string; redBand: string; progressPercent: number | null; density: string; view: string; observedAt: string; source: string; validUntil: string; status: string; poi?: Poi }
type Route = { id: string; name: string; duration: string; distance: string; audience: string[]; difficulty: string; stairs: string; start: string; end: string; image: string; stops: string[]; reason: string; facilities: string }
type Facility = { id: string; name: string; kind: string; location: string; note: string; status: string; coordinates: [number, number] }
type ShuttleRoute = { id: string; name: string; coordinates: [number, number][]; operatingNote: string }
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1'
const nav = ref('maple')
const seasonOptions = [
  { id: 'spring' as Season, label: '春·新绿', icon: Flower2, kicker: 'SPRING · AWAKENING', headline: '春山新绿，寻花访古', description: '看新叶舒展，听山寺与古迹的故事。春日内容与花期仍需景区核验。', leafStage: '新叶青绿', leafNote: '春季以新叶与自然观察为主，红度不作为本季推荐指标。', features: ['新绿寻芳', '古迹寻访', '轻行山路'] },
  { id: 'summer' as Season, label: '夏·浓荫', icon: Sun, kicker: 'SUMMER · FOREST', headline: '一山浓荫，林下慢行', description: '把山林、亲子自然与茶文化放进夏日行程，出发前留意天气与开放范围。', leafStage: '浓绿生长', leafNote: '夏季枫叶以绿色为主，景观重点转向林荫与自然体验。', features: ['林荫慢行', '亲子自然', '茶文化'] },
  { id: 'autumn' as Season, label: '秋·枫染', icon: Leaf, kicker: 'AUTUMN · MAPLE NOTES', headline: '一叶知秋，一山有故事', description: '先读各点枫况，再看山寺、遗迹与茶文化。秋色只是认识栖霞的一页。', leafStage: '绿黄渐染', leafNote: '红度是观察范围内红叶占比的人工估计，需与日期、密度、来源一起阅读。', features: ['分点枫况', '秋色游线', '山寺人文'] },
  { id: 'winter' as Season, label: '冬·山静', icon: Snowflake, kicker: 'WINTER · QUIET MOUNTAIN', headline: '山静冬深，访古听山', description: '冬日以清寂山景、人文讲解和暖心服务为线索，结冰与交通信息以官方公告为准。', leafStage: '落叶休眠', leafNote: '冬季落叶后不展示红度百分比，以山景与文化内容作为体验重点。', features: ['冬日山景', '人文听讲', '暖心服务'] }
]
const season = computed(() => seasonAt(now.value))
const theme = computed(() => seasonOptions.find(item => item.id === season.value)!)
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
const storedAudience = sessionStorage.getItem('maple-audience')
const audience = ref(storedAudience && ['photo_outdoor', 'couple', 'family', 'family_senior', 'senior', 'other'].includes(storedAudience) ? storedAudience : 'other')
const interest = ref<string | null>(null)
const pois = ref<Poi[]>([])
const maple = ref<Maple[]>([])
const routes = ref<Route[]>([])
const facilities = ref<Facility[]>([])
const shuttleRoutes = ref<ShuttleRoute[]>([])
const scenicMap = ref<InstanceType<typeof ScenicMap>>()
const selectedPoi = ref<Poi | null>(null)
const selectedMaple = ref<Maple | null>(null)
const selectedRoute = ref<Route | null>(null)
const chatOpen = ref(false)
const message = ref('')
const messages = ref([{ role: 'assistant', text: '你好，我是栖霞山伴游。可以问我点位、路线、厕所或当前演示枫况。' }])
const loading = ref(false)
const toast = ref('')
const now = ref(Date.now())
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
    const [p, m, r, f, mapData] = await Promise.all(['/pois', '/maple', '/routes', '/facilities', '/map'].map(path => api(path, { signal: controller.signal })))
    if (disposed) return
    pois.value = p; maple.value = m; routes.value = r; facilities.value = f; shuttleRoutes.value = mapData.shuttleRoutes ?? []
    hasData.value = true
    now.value = Date.now()
  } catch { if (!disposed) dataError.value = true }
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
const featuredMaple = computed(() => activeMaple.value.find(item => item.poiId === 'maple-valley'))
const featuredPercent = computed(() => featuredMaple.value ? redPercent(featuredMaple.value) : null)
const foliageTone = computed(() => autumnTone(featuredPercent.value))
const autumnStyle = computed(() => season.value === 'autumn' ? { '--color-primary': leafColor(featuredPercent.value, true) } : {})
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
function chooseAudience(key: string) { audience.value = key; sessionStorage.setItem('maple-audience', key); toast.value = `已按“${audienceLabels[key]}”更新路线` }
function closeDetail() { selectedPoi.value = null; selectedRoute.value = null; selectedMaple.value = null; selectedTopic.value = null }
</script>

<template>
  <div class="app-shell paper-grain" :data-season="season" :data-foliage="foliageTone" :style="autumnStyle">
    <header class="topbar">
      <button class="brand" aria-label="返回栖霞山核心首页" @click="selectNav('maple')"><img src="/assets/qixia-mark.png" alt="栖霞山" /><span><b>栖霞山核心</b><small>QIXIA MOUNTAIN</small></span></button>
      <div class="topbar-note"><span class="kicker">FOUR SEASONS · {{ localYear }}</span><span>四季游览服务 · 演示数据</span></div>
    </header>


    <main :aria-busy="dataLoading">
      <Transition name="page" mode="out-in">
        <div v-if="dataLoading" key="loading" class="loading-page" role="status"><ScenicIcon :size="58" class="loading-leaf" /><span>展开一页山间来信…</span><div class="skeleton-grid" aria-hidden="true"><div v-for="i in 3" :key="i" class="skeleton-card"><div /><span /><span /><span /></div></div></div>
        <div v-else-if="!hasData" key="error" class="load-error"><ScenicIcon :size="48" /><h2>山间来信暂未送达</h2><p>连接暂时不可用，请重试加载景点与枫况。</p><button class="outline-btn" @click="load"><RefreshCw :size="17" />重新加载</button></div>
        <div v-else :key="nav" class="page-view">
          <div v-if="dataError" class="refresh-error" role="status">更新暂未成功，以下保留上次数据，并继续按有效期判断。<button class="text-btn" @click="load">重试更新</button></div>
      <section v-if="nav === 'maple'" class="season-overview">
        <div class="drifting-leaves" aria-hidden="true"><ScenicIcon v-for="i in 6" :key="i" :size="24 + i * 7" filled :style="{ '--drift-index': i }" /></div>
        <div class="season-topline"><span class="kicker">QIXIA · FOUR SEASONS</span><div class="season-calendar" aria-label="四季时序，按时间自动更新"><span v-for="item in seasonOptions" :key="item.id" :class="{ active: season === item.id }" :aria-current="season === item.id ? 'date' : undefined"><component :is="item.icon" :size="15" />{{ item.label }}</span></div></div>
        <div class="season-date"><Clock3 :size="13" />{{ localDate }} · 南京时序 · 自动随季节展开</div>
        <Transition name="fade" mode="out-in"><div :key="season" class="season-lead"><div><span class="season-caption">{{ theme.kicker }}</span><h1>{{ theme.headline }}</h1><p>{{ theme.description }}</p><div class="season-feature-tags"><span v-for="feature in theme.features" :key="feature">{{ feature }}</span></div></div><div class="season-observation"><span class="kicker">{{ season === 'autumn' ? 'LOCAL OBSERVATION' : 'SEASONAL NOTES' }}</span><template v-if="season === 'autumn'"><div class="observation-title">{{ featuredMaple?.poi?.name || '枫林谷' }} · 单点观测</div><Transition name="fade" mode="out-in"><LeafProgress :key="featuredPercent ?? 'unknown'" :percent="featuredPercent" :label="featuredMaple?.poi?.name || '枫林谷'" /></Transition><p class="observation-note">{{ leafCaption(featuredPercent) }}，主题色随有效观测轻染。单点演示，不代表全山。</p></template><template v-else><component :is="theme.icon" class="season-big-icon" :size="44" /><h3>{{ theme.leafStage }}</h3><p>{{ theme.leafNote }}</p></template><small>{{ season === 'autumn' ? '每 5 分钟尝试更新演示观测 · 过期即停止联动' : '随南京日历自动换季 · 红度仅用于有效秋季观测' }}</small></div></div></Transition>
      </section>
      <section v-if="nav === 'map'" class="content-section paper-wash">
        <div class="section-heading compact"><span class="kicker">MAP & SERVICES</span><h2>地图与游览服务</h2><p>真实天地图底图，让厕所、接驳车和停车场先被看见。点位与站点线路当前为演示记录。</p></div>
        <div class="toolbar"><div class="segmented"><button v-for="(label, key) in audienceLabels" :key="key" :class="{ active: audience === key }" @click="chooseAudience(key)">{{ label }}</button></div><div class="toolbar-actions"><button class="outline-btn" @click="scenicMap?.reset()"><MapPin :size="17" />回到栖霞山</button><button class="outline-btn" @click="scenicMap?.locate()"><LocateFixed :size="17" />使用我的位置</button></div></div>
        <div class="map-layout"><ScenicMap ref="scenicMap" :pois="pois" :facilities="facilities" :shuttle-routes="shuttleRoutes" @select-poi="id => { const poi = pois.find(item => item.id === id); if (poi) showPoi(poi) }" @notice="value => toast = value" /><div class="route-list"><div class="list-heading"><span>推荐路线</span><small>{{ recommendedRoutes.length }} 条 · {{ audienceLabels[audience] }}</small></div><article v-for="route in recommendedRoutes" :key="route.id" class="route-ticket" v-reveal tabindex="0" role="button" :aria-label="`查看${route.name}详情`" @click="showRoute(route)" @keydown.enter="showRoute(route)" @keydown.space.prevent="showRoute(route)"><img v-image-fade :src="route.image" alt="" /><div class="ticket-content"><span class="ticket-kicker">ROUTE TEMPLATE · 演示</span><h3>{{ route.name }}</h3><div class="route-meta"><span><Clock3 :size="14" />{{ route.duration }}</span><span><Mountain :size="14" />{{ route.difficulty }}</span></div><p>{{ route.reason }}</p><button class="text-btn">查看路线详情 <ArrowRight :size="15" /></button></div></article><div v-if="!recommendedRoutes.length" class="empty-state"><AlertTriangle :size="20" /><b>暂时没有同时满足条件的路线</b><span>可切换同行方式，或先浏览点位介绍。</span></div><div class="info-callout"><Info :size="17" /><span>票务、早间入园政策与活动日期须经官方核验；本版不发布未经确认的免票承诺。</span></div></div></div>
      </section>

      <section v-if="nav === 'maple'" class="content-section maple-section">
        <div class="section-heading compact"><span class="kicker">MAPLE CONDITION</span><h2>{{ season === 'autumn' ? '看枫况，再决定往哪走。' : '收藏秋色，也看看此刻的栖霞。' }}</h2><p>{{ season === 'autumn' ? '把红度百分比、成片密度和视角分开记录，每条信息都带观察时间与来源。' : '主题已随当前季节自动更新。此刻适合读山、访古与林间慢行；秋季档案可按需展开，不代表当季实况。' }}</p></div>
        <div class="leaf-stage-guide"><span><ScenicIcon class="leaf-green" :size="22" filled />青绿生长</span><span><ScenicIcon class="leaf-yellow" :size="22" filled />黄绿渐染</span><span><ScenicIcon class="leaf-red" :size="22" filled />红叶渐盛</span><small>颜色示意不等于花期预测</small></div>
        <button v-if="season !== 'autumn'" class="outline-btn archive-toggle" :aria-expanded="archiveOpen" @click="archiveOpen = !archiveOpen"><ScenicIcon :size="20" />{{ archiveOpen ? '收起秋季档案' : '翻阅秋季演示档案' }}</button><div v-if="season === 'autumn'" class="interest-bar"><span>你更想看</span><button v-for="(label, key) in interestLabels" :key="key" :class="{ active: interest === key }" @click="interest = interest === key ? null : key">{{ label }}</button><small>可跳过</small></div>
        <TransitionGroup name="cards" tag="div" class="maple-grid"><article v-for="record in displayMaple" :key="record.poiId" class="maple-card" v-reveal tabindex="0" role="button" :aria-label="`查看${record.poi?.name}枫况详情`" @click="showMaple(record)" @keydown.enter="showMaple(record)" @keydown.space.prevent="showMaple(record)"><div class="maple-image"><img v-image-fade :src="record.poi?.image" alt="" /><span class="status-stamp" :class="{ stale: !isCurrent(record) }">{{ season === 'autumn' && isCurrent(record) ? '有效观测 · 演示' : '秋季档案 · 演示' }}</span></div><div class="maple-body"><span class="kicker">{{ record.poi?.name }}</span><h3>{{ record.stage }}</h3><p>{{ record.density }} · {{ record.view }}</p><LeafProgress v-if="season === 'autumn'" :percent="redPercent(record)" :label="record.poi?.name || '点位'" compact /><p v-else class="archive-note">秋季留影，当前不作红度判断</p><div class="maple-facts"><span><b>观测区间</b>{{ record.redBand }}</span><span><b>观察日期</b>{{ record.observedAt }}</span></div><small>{{ record.source }} · 有效至 {{ record.validUntil.slice(0, 10) }}</small></div></article></TransitionGroup>
        <div v-if="season === 'autumn' && !recommendedMaple.length" class="empty-state"><Leaf :size="24" /><b>暂无有效枫况记录</b><span>等待景区补充新观测，可先浏览地图与人文内容。</span></div>
        <div class="coverage-note"><Info :size="18" /><span>当前为局部演示数据，不代表全山实时状态。百分比为样例观测值，未知与过期记录不以 0% 代替，也不用于当前推荐。</span></div>
      </section>

      <section v-if="nav === 'maple'" class="culture-section"><div class="section-heading"><span class="kicker">BEYOND THE MAPLE</span><h2>一山四季，不止一叶。</h2><p>用人文、茶与山林延长体验。专业讲解内容经审核发布，资料不足时明确提示。</p></div><div class="culture-grid"><button v-for="item in cultureTopics" :key="item.id" class="culture-card" v-reveal @click="selectedTopic = item.id"><component :is="item.icon" :size="25" /><small>{{ item.subtitle }}</small><h3>{{ item.title }}</h3><span>{{ item.status }}</span><ArrowRight :size="18" /></button></div></section>

      <section v-if="nav === 'chat'" class="content-section chat-page"><div class="section-heading compact"><span class="kicker">TEXT COMPANION</span><h2>问一句，先把选择变清楚。</h2><p>伴游只读取已发布的结构化信息，模型未连接时仍保留可用入口。</p></div><div class="chat-panel"><TransitionGroup name="messages" tag="div" class="chat-messages"><div v-for="(item, index) in messages" :key="index" class="chat-line" :class="item.role"><span v-if="item.role === 'assistant'" class="chat-mark"><ScenicIcon :size="19" /></span><p>{{ item.text }}</p></div><div v-if="loading" key="typing" class="chat-line assistant typing"><span class="chat-mark"><RefreshCw :size="14" /></span><p>正在整理演示数据<span class="typing-dots">…</span></p></div></TransitionGroup><form class="chat-input" @submit.prevent="sendMessage"><input v-model="message" aria-label="输入问题" placeholder="例如：带老人，想走一小时内的路线" maxlength="500" /><button class="primary-btn" type="submit" aria-label="发送"><Send :size="18" /></button></form><div class="chat-suggestions"><button @click="message = '带老人，推荐一条路线'">带老人，推荐路线</button><button @click="message = '哪里有厕所？'">哪里有厕所？</button><button @click="message = '现在枫况怎样？'">现在枫况怎样？</button></div></div></section>

      <section v-if="nav === 'admin'" class="content-section admin-page"><div class="section-heading compact"><span class="kicker">CONTENT DESK</span><h2>内容后台 · 首版监看</h2><p>这里展示最小发布闭环的结构。生产环境应接入 HttpOnly 会话、核验和审计权限。</p></div><div class="admin-grid"><div class="admin-summary"><div><span>点位</span><b>{{ pois.length }}</b></div><div><span>路线</span><b>{{ routes.length }}</b></div><div><span>枫况记录</span><b>{{ maple.length }}</b></div><div><span>设施</span><b>{{ facilities.length }}</b></div></div><div class="admin-table"><div class="table-row table-head"><span>最近动作</span><span>操作人</span><span>时间</span><span>状态</span></div><div class="table-row"><span>发布演示数据</span><span>demo-admin</span><span>2026-10-31 18:00</span><span class="ok"><CheckCircle2 :size="15" />已记录</span></div><div class="table-row"><span>枫林谷枫况核验</span><span>content-team</span><span>2026-10-30 09:20</span><span class="ok"><CheckCircle2 :size="15" />已发布</span></div></div></div></section>

      </div></Transition>
      <Transition name="drawer"><section v-if="selectedPoi || selectedRoute || selectedMaple || topic" class="detail-drawer"><button class="drawer-close" aria-label="关闭详情" @click="closeDetail"><X :size="18" /></button><template v-if="topic"><span class="kicker">QIXIA CULTURE NOTES</span><h2>{{ topic.title }}</h2><p class="drawer-subtitle">{{ topic.subtitle }}</p><p>{{ topic.description }}</p><div class="info-callout"><ShieldCheck :size="18" />{{ topic.status }} · 首版内容主题入口</div><button class="outline-btn" @click="selectNav('map')">先看地图与服务 <Map :size="16" /></button></template><template v-else-if="selectedRoute"><img v-image-fade :src="selectedRoute.image" alt="" class="drawer-image" /><span class="kicker">ROUTE DETAIL · 演示模板</span><h2>{{ selectedRoute.name }}</h2><div class="detail-stats"><span><Clock3 :size="16" />{{ selectedRoute.duration }}</span><span><MapPin :size="16" />{{ selectedRoute.distance }}</span><span><Mountain :size="16" />{{ selectedRoute.difficulty }}</span></div><p>{{ selectedRoute.reason }}</p><h4>路段顺序</h4><div class="stop-line"><span v-for="(stop, i) in selectedRoute.stops" :key="stop"><b>{{ i + 1 }}</b>{{ stop }}</span></div><div class="info-callout"><ShieldCheck :size="18" />{{ selectedRoute.facilities }}</div></template><template v-else-if="selectedPoi"><img v-image-fade :src="selectedPoi.image" alt="" class="drawer-image" /><span class="kicker">POINT OF INTEREST · 演示资料</span><h2>{{ selectedPoi.name }}</h2><p class="drawer-subtitle">{{ selectedPoi.subtitle }}</p><p>{{ selectedPoi.description }}</p><div class="tag-row"><span v-for="tag in selectedPoi.tags" :key="tag">{{ tag }}</span></div><div v-if="selectedMaple" class="maple-detail"><h4>枫况观测 · {{ isCurrent(selectedMaple) ? '有效' : '历史记录' }}</h4><LeafProgress v-if="season === 'autumn'" :percent="redPercent(selectedMaple)" :label="selectedPoi.name" /><p v-else class="archive-note">秋季演示档案，不代表当前季节状态。</p><div class="detail-stats"><span><b>红度</b>{{ selectedMaple.redBand }}</span><span><b>密度</b>{{ selectedMaple.density }}</span><span><b>视角</b>{{ selectedMaple.view }}</span></div><small>{{ selectedMaple.observedAt }} · {{ selectedMaple.source }} · 有效至 {{ selectedMaple.validUntil.slice(0, 10) }}</small></div><button class="outline-btn" @click="selectNav('map')">查看关联路线 <ExternalLink :size="16" /></button></template></section></Transition>
    </main>

    <footer class="mountain-footer"><div class="footer-inner"><div class="footer-brand"><img src="/assets/qixia-mark.png" alt="栖霞山" /><div><b>栖霞山核心</b><span>四季看山，读懂栖霞。</span></div></div><div class="footer-links"><button @click="selectNav('admin')">内容后台</button><button @click="toast = '反馈已准备好，首版将记录为待处理事项'">纠错反馈</button><span>v0.3 · 演示数据</span></div></div><img class="hills" src="/assets/hills.svg" alt="" /></footer>
    <nav class="bottom-nav" aria-label="主要功能"><button :class="{ active: nav === 'maple' }" :aria-current="nav === 'maple' ? 'page' : undefined" @click="selectNav('maple')"><ScenicIcon :size="29" :filled="nav === 'maple'" /><span>枫况</span></button><button :class="{ active: nav === 'map' }" :aria-current="nav === 'map' ? 'page' : undefined" @click="selectNav('map')"><ScenicIcon kind="pagoda" :size="29" /><span>地图服务</span></button><button :class="{ active: nav === 'chat' }" :aria-current="nav === 'chat' ? 'page' : undefined" @click="selectNav('chat')"><ScenicIcon kind="guide" :size="29" /><span>问伴游</span></button></nav>
    <Transition name="float"><button v-if="showBackTop" class="back-to-top" aria-label="返回顶部" @click="backToTop"><ArrowUp :size="20" /><span>顶部</span></button></Transition>
    <button class="floating-chat" aria-label="打开伴游" @click="chatOpen = !chatOpen"><ScenicIcon kind="guide" :size="27" /></button>
    <Transition name="float"><div v-if="chatOpen" class="mini-chat"><button class="mini-close" aria-label="关闭" @click="chatOpen = false"><X :size="16" /></button><b>问伴游</b><p>想问路线、点位还是厕所？</p><button class="primary-btn" @click="chatOpen = false; selectNav('chat')">打开文字伴游 <ArrowRight :size="16" /></button></div></Transition>
    <Transition name="fade"><div v-if="toast" class="toast" role="status"><Info :size="16" />{{ toast }}<button aria-label="关闭提示" @click="toast = ''"><X :size="15" /></button></div></Transition>
  </div>
</template>
