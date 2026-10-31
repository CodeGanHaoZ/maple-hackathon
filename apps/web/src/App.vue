<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Map, Leaf, MessageCircle, ArrowRight, Compass, LocateFixed, Clock3, MapPin, Toilet, Armchair, Mountain, Send, RefreshCw, X, ExternalLink, ShieldCheck, Info, CheckCircle2, AlertTriangle } from 'lucide-vue-next'

type Poi = { id: string; name: string; subtitle: string; description: string; image: string; tags: string[] }
type Maple = { poiId: string; stage: string; redBand: string; density: string; view: string; observedAt: string; source: string; validUntil: string; status: string; poi?: Poi }
type Route = { id: string; name: string; duration: string; distance: string; audience: string[]; difficulty: string; stairs: string; start: string; end: string; image: string; stops: string[]; reason: string; facilities: string }
const API = import.meta.env.VITE_API_URL || 'http://localhost:8787/api/v1'
const nav = ref('home')
const audience = ref('other')
const interest = ref<string | null>(null)
const pois = ref<Poi[]>([])
const maple = ref<Maple[]>([])
const routes = ref<Route[]>([])
const facilities = ref<any[]>([])
const selectedPoi = ref<Poi | null>(null)
const selectedMaple = ref<Maple | null>(null)
const selectedRoute = ref<Route | null>(null)
const chatOpen = ref(false)
const message = ref('')
const messages = ref([{ role: 'assistant', text: '你好，我是枫况伴游。可以问我点位、路线、厕所或当前演示枫况。' }])
const loading = ref(false)
const toast = ref('')

async function api(path: string, options?: RequestInit) { const res = await fetch(`${API}${path}`, { headers: { 'content-type': 'application/json' }, ...options }); if (!res.ok) throw new Error('请求失败'); return (await res.json()).data }
async function load() { try { const [p, m, r, f] = await Promise.all([api('/pois'), api('/maple'), api('/routes'), api('/facilities')]); pois.value = p; maple.value = m; routes.value = r; facilities.value = f } catch { toast.value = '服务暂时离线，已保留页面结构。' } }
onMounted(load)
const activeMaple = computed(() => maple.value.filter((item) => item.status === '有效'))
const recommendedRoutes = computed(() => routes.value.filter((route) => route.audience.includes(audience.value) || audience.value === 'other').slice(0, 3))
const recommendedMaple = computed(() => activeMaple.value.filter((record) => !interest.value || (interest.value === 'density' ? record.density.includes('成片') : interest.value === 'color' ? record.redBand !== '暂无信息' : record.view !== '暂无信息')).slice(0, 3))
const audienceLabels: Record<string, string> = { photo_outdoor: '摄影户外', couple: '情侣同行', family: '亲子同行', family_senior: '亲子带老人', senior: '银发慢行', other: '先看看' }
const interestLabels: Record<string, string> = { color: '看色彩', density: '看成片', view: '看层次' }
function selectNav(key: string) { nav.value = key; selectedPoi.value = null; selectedRoute.value = null; selectedMaple.value = null; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function showPoi(poi: Poi) { selectedPoi.value = poi; selectedMaple.value = maple.value.find((item) => item.poiId === poi.id) ?? null; nav.value = 'map' }
function showRoute(route: Route) { selectedRoute.value = route; nav.value = 'map' }
function showMaple(record: Maple) { selectedMaple.value = record; selectedPoi.value = record.poi ?? pois.value.find((poi) => poi.id === record.poiId) ?? null; nav.value = 'maple' }
async function sendMessage() { if (!message.value.trim() || loading.value) return; const current = message.value.trim(); messages.value.push({ role: 'user', text: current }); message.value = ''; loading.value = true; try { const data = await api('/chat', { method: 'POST', body: JSON.stringify({ message: current }) }); messages.value.push({ role: 'assistant', text: data.answer }); } catch { messages.value.push({ role: 'assistant', text: '当前连接不可用，你仍可以使用地图和枫况列表。' }) } finally { loading.value = false } }
function chooseAudience(key: string) { audience.value = key; sessionStorage.setItem('maple-audience', key); toast.value = `已按“${audienceLabels[key]}”更新路线` }
function closeDetail() { selectedPoi.value = null; selectedRoute.value = null; selectedMaple.value = null }
</script>

<template>
  <div class="app-shell paper-grain">
    <header class="topbar">
      <button class="brand" aria-label="返回首页" @click="selectNav('home')"><img src="/assets/qixia-mark.png" alt="栖霞山" /><span><b>枫况</b><small>QIXIA AUTUMN COMPANION</small></span></button>
      <div class="topbar-note"><span class="kicker">AUTUMN NOTES · 2026</span><span>局部核验范围 · 演示数据</span></div>
    </header>

    <main>
      <section v-if="nav === 'home'" class="hero paper-wash">
        <div class="hero-copy"><span class="kicker">MAPLE COMPANION</span><h1>在山影与红叶之间，<em>找到今天的走法。</em></h1><p>枫况把已整理的路线、点位和枫色放在一张轻盈的秋日地图里。先选你想看的，再决定怎么走。</p><div class="hero-actions"><button class="primary-btn" @click="selectNav('map')"><Map :size="18" />看地图与路线</button><button class="paper-btn" @click="selectNav('maple')"><Leaf :size="18" />看各点枫况</button></div><div class="hero-foot"><ShieldCheck :size="16" /><span>内容以结构化演示数据为准 · 不提供现场导航</span></div></div>
        <div class="hero-art"><img src="/assets/maple-canopy.png" alt="秋日枫林示意" /><div class="hero-art-caption"><span>绯林一页</span><b>秋色正在展开</b></div></div>
      </section>

      <section v-if="nav === 'home'" class="home-band">
        <div class="section-heading"><span class="kicker">CHOOSE YOUR PACE</span><h2>先说说，和谁一起看山。</h2><p>不需要登录，也不需要授权定位。选择只影响推荐顺序。</p></div>
        <div class="audience-grid"><button v-for="(label, key) in audienceLabels" :key="key" class="audience-card" :class="{ selected: audience === key }" @click="chooseAudience(key)"><span class="card-index">0{{ Object.keys(audienceLabels).indexOf(key) + 1 }}</span><strong>{{ label }}</strong><small>{{ key === 'photo_outdoor' ? '找层次丰富的秋色' : key === 'family' ? '短一些，途中能休息' : key === 'senior' ? '慢慢走，指引清楚' : key === 'couple' ? '好看，也方便停留' : key === 'family_senior' ? '照顾不同节奏' : '浏览目前可用路线' }}</small><ArrowRight :size="17" /></button></div>
        <div class="feature-strip"><div><Compass :size="25" /><span><b>地图路线</b> 已核验模板，条件不合时如实说明</span></div><div><Leaf :size="25" /><span><b>分点枫况</b> 记录日期、来源与有效期</span></div><div><MessageCircle :size="25" /><span><b>文字伴游</b> AI 不可用也能继续浏览</span></div></div>
      </section>

      <section v-if="nav === 'map'" class="content-section paper-wash"><div class="section-heading compact"><span class="kicker">MAP & ROUTES</span><h2>地图与路线</h2><p>在核验范围内看点位、设施和路线；地图为示意，列表信息优先。</p></div><div class="toolbar"><div class="segmented"><button v-for="(label, key) in audienceLabels" :key="key" :class="{ active: audience === key }" @click="chooseAudience(key)">{{ label }}</button></div><button class="outline-btn" @click="toast = '定位仅在你主动点击时请求，本版暂不启用持续导航'" ><LocateFixed :size="17" />使用我的位置</button></div><div class="map-layout"><div class="map-canvas"><div class="map-boundary"><span class="map-label label-gate">秋山入口</span><span class="map-label label-lake">明镜湖</span><span class="map-label label-valley">枫林谷</span><span class="map-label label-terrace">红叶坡</span><svg viewBox="0 0 600 360" aria-label="核验范围示意地图"><path d="M68 270 C180 180 200 286 300 182 S450 125 540 82"/><path d="M88 220 C160 155 235 228 315 135 S440 112 510 58"/><circle cx="120" cy="248" r="13"/><circle cx="282" cy="184" r="13"/><circle cx="403" cy="125" r="13"/><circle cx="500" cy="76" r="13"/></svg><div class="map-legend"><span><i class="dot dot-route" />已核验路线示意</span><span><i class="dot dot-poi" />点位</span></div></div><div class="map-disclaimer"><Info :size="15" />暂无授权底图，当前仅展示演示道路与点位，不能作为步行导航。</div></div><div class="route-list"><div class="list-heading"><span>推荐路线</span><small>{{ recommendedRoutes.length }} 条 · {{ audienceLabels[audience] }}</small></div><article v-for="route in recommendedRoutes" :key="route.id" class="route-ticket" @click="showRoute(route)"><img :src="route.image" alt="" /><div class="ticket-content"><span class="ticket-kicker">VERIFIED TEMPLATE · 演示</span><h3>{{ route.name }}</h3><div class="route-meta"><span><Clock3 :size="14" />{{ route.duration }}</span><span><Mountain :size="14" />{{ route.difficulty }}</span></div><p>{{ route.reason }}</p><button class="text-btn">查看路线详情 <ArrowRight :size="15" /></button></div></article><div v-if="!recommendedRoutes.length" class="empty-state"><AlertTriangle :size="20" /><b>暂时没有同时满足条件的路线</b><span>可切换同行方式，或先浏览点位介绍。</span></div></div></div></section>

      <section v-if="nav === 'maple'" class="content-section"><div class="section-heading compact"><span class="kicker">MAPLE CONDITION</span><h2>每一个点，都有自己的秋天。</h2><p>红度、密度和视角分别记录；过期信息会明确标注。</p></div><div class="interest-bar"><span>你更想看</span><button v-for="(label, key) in interestLabels" :key="key" :class="{ active: interest === key }" @click="interest = interest === key ? null : key">{{ label }}</button><small>可跳过</small></div><div class="maple-grid"><article v-for="record in recommendedMaple" :key="record.poiId" class="maple-card" @click="showMaple(record)"><div class="maple-image"><img :src="record.poi?.image" alt="" /><span class="status-stamp" :class="{ stale: record.status !== '有效' }">{{ record.status }}</span></div><div class="maple-body"><span class="kicker">{{ record.poi?.name }}</span><h3>{{ record.stage }}</h3><p>{{ record.density }} · {{ record.view }}</p><div class="maple-facts"><span><b>红度</b>{{ record.redBand }}</span><span><b>观察</b>{{ record.observedAt }}</span></div><small>{{ record.source }}</small></div></article></div><div class="coverage-note"><Info :size="18" /><span>当前为局部演示数据，不代表全山实时状态。无有效记录的点位不会被写成“现在最红”。</span></div></section>

      <section v-if="nav === 'chat'" class="content-section chat-page"><div class="section-heading compact"><span class="kicker">TEXT COMPANION</span><h2>问一句，先把选择变清楚。</h2><p>伴游只读取已发布的结构化信息，模型未连接时仍保留可用入口。</p></div><div class="chat-panel"><div class="chat-messages"><div v-for="(item, index) in messages" :key="index" class="chat-line" :class="item.role"><span v-if="item.role === 'assistant'" class="chat-mark"><Leaf :size="14" /></span><p>{{ item.text }}</p></div><div v-if="loading" class="chat-line assistant"><span class="chat-mark"><RefreshCw :size="14" /></span><p>正在整理演示数据…</p></div></div><form class="chat-input" @submit.prevent="sendMessage"><input v-model="message" aria-label="输入问题" placeholder="例如：带老人，想走一小时内的路线" maxlength="500" /><button class="primary-btn" type="submit" aria-label="发送"><Send :size="18" /></button></form><div class="chat-suggestions"><button @click="message = '带老人，推荐一条路线'">带老人，推荐路线</button><button @click="message = '哪里有厕所？'">哪里有厕所？</button><button @click="message = '现在枫况怎样？'">现在枫况怎样？</button></div></div></section>

      <section v-if="nav === 'admin'" class="content-section admin-page"><div class="section-heading compact"><span class="kicker">CONTENT DESK</span><h2>内容后台 · 首版监看</h2><p>这里展示最小发布闭环的结构。生产环境应接入 HttpOnly 会话、核验和审计权限。</p></div><div class="admin-grid"><div class="admin-summary"><div><span>点位</span><b>{{ pois.length }}</b></div><div><span>路线</span><b>{{ routes.length }}</b></div><div><span>枫况记录</span><b>{{ maple.length }}</b></div><div><span>设施</span><b>{{ facilities.length }}</b></div></div><div class="admin-table"><div class="table-row table-head"><span>最近动作</span><span>操作人</span><span>时间</span><span>状态</span></div><div class="table-row"><span>发布演示数据</span><span>demo-admin</span><span>2026-10-31 18:00</span><span class="ok"><CheckCircle2 :size="15" />已记录</span></div><div class="table-row"><span>枫林谷枫况核验</span><span>content-team</span><span>2026-10-30 09:20</span><span class="ok"><CheckCircle2 :size="15" />已发布</span></div></div></div></section>

      <section v-if="selectedPoi || selectedRoute || selectedMaple" class="detail-drawer"><button class="drawer-close" @click="closeDetail"><X :size="18" /></button><template v-if="selectedRoute"><img :src="selectedRoute.image" alt="" class="drawer-image" /><span class="kicker">ROUTE DETAIL · 演示模板</span><h2>{{ selectedRoute.name }}</h2><div class="detail-stats"><span><Clock3 :size="16" />{{ selectedRoute.duration }}</span><span><MapPin :size="16" />{{ selectedRoute.distance }}</span><span><Mountain :size="16" />{{ selectedRoute.difficulty }}</span></div><p>{{ selectedRoute.reason }}</p><h4>路段顺序</h4><div class="stop-line"><span v-for="(stop, i) in selectedRoute.stops" :key="stop"><b>{{ i + 1 }}</b>{{ stop }}</span></div><div class="info-callout"><ShieldCheck :size="18" />{{ selectedRoute.facilities }}</div></template><template v-else-if="selectedPoi"><img :src="selectedPoi.image" alt="" class="drawer-image" /><span class="kicker">POINT OF INTEREST · 演示资料</span><h2>{{ selectedPoi.name }}</h2><p class="drawer-subtitle">{{ selectedPoi.subtitle }}</p><p>{{ selectedPoi.description }}</p><div class="tag-row"><span v-for="tag in selectedPoi.tags" :key="tag">{{ tag }}</span></div><div v-if="selectedMaple" class="maple-detail"><h4>当前枫况 · {{ selectedMaple.status }}</h4><div class="detail-stats"><span><b>红度</b>{{ selectedMaple.redBand }}</span><span><b>密度</b>{{ selectedMaple.density }}</span><span><b>视角</b>{{ selectedMaple.view }}</span></div><small>{{ selectedMaple.observedAt }} · {{ selectedMaple.source }} · 有效至 {{ selectedMaple.validUntil.slice(0, 10) }}</small></div><button class="outline-btn" @click="selectNav('map')">查看关联路线 <ExternalLink :size="16" /></button></template></section>
    </main>

    <footer class="mountain-footer"><div class="footer-inner"><div class="footer-brand"><img src="/assets/qixia-mark.png" alt="栖霞山" /><div><b>枫况</b><span>在秋色里，找到自己的走法。</span></div></div><div class="footer-links"><button @click="selectNav('admin')">内容后台</button><button @click="toast = '反馈已准备好，首版将记录为待处理事项'">纠错反馈</button><span>v0.1 · 演示数据</span></div></div><img class="hills" src="/assets/hills.svg" alt="" /></footer>
    <nav class="bottom-nav"><button :class="{ active: nav === 'map' }" @click="selectNav('map')"><Map :size="19" /><span>地图路线</span></button><button :class="{ active: nav === 'maple' }" @click="selectNav('maple')"><Leaf :size="19" /><span>看枫况</span></button><button :class="{ active: nav === 'chat' }" @click="selectNav('chat')"><MessageCircle :size="19" /><span>问伴游</span></button></nav>
    <button class="floating-chat" aria-label="打开伴游" @click="chatOpen = !chatOpen"><MessageCircle :size="20" /></button>
    <div v-if="chatOpen" class="mini-chat"><button class="mini-close" aria-label="关闭" @click="chatOpen = false"><X :size="16" /></button><b>问伴游</b><p>想问路线、点位还是厕所？</p><button class="primary-btn" @click="chatOpen = false; selectNav('chat')">打开文字伴游 <ArrowRight :size="16" /></button></div>
    <div v-if="toast" class="toast" role="status"><Info :size="16" />{{ toast }}<button aria-label="关闭提示" @click="toast = ''"><X :size="15" /></button></div>
  </div>
</template>
