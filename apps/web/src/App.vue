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
// 园区核心主题「读一首诗 等一山红」：拆成 诗 / 山 / 红 三个核心主体
const expandedPoem = ref<string | null>(null)
function togglePoem(id: string) { expandedPoem.value = expandedPoem.value === id ? null : id }
const narrativeThreads = [
  { key: 'shi', glyph: '诗', label: '读', body: '诗是这座山最早的导览。《摄山志》「诗」章存 328 条记录，卷首「天章·诗」与卷六、卷七各一卷。碑刻、摩崖与志书，比任何一份攻略都更早写下该看什么。', tag: '卷六·卷七 诗' },
  { key: 'shan', glyph: '山', label: '摄', body: '摄山之名，取「山中多药草可以摄生」。三峰两涧——虎山、凤翔峰、龙山与桃花涧、中峰涧，是登临者要回答的第一道题：往哪走。', tag: '摄山 · 三峰两涧' },
  { key: 'hong', glyph: '红', label: '等', body: '红是分批到的。同一面湖，不同秋日颜色不同；同一座山，不同点位转色先后不同。所以真问题不是「哪天红」，而是「今天几点、站哪看」。', tag: '渐次转色' }
]
const poems = [
  { id: 'cai', theme: '等一山红', title: '寄摄山张白云', author: '蔡㺱',
    lines: ['红叶相招策杖游，', '岩扉一隔几经秋。'],
    full: ['红叶相招策杖游，岩扉一隔几经秋。', '荷衣遥想凌千仞，翠滴沧波万里流。'],
    note: '红是邀请，杖是准备。这句把「等」写成了动身。', source: '《摄山志》卷七·诗，第 570 页', caveat: '作者署名待核' },
  { id: 'li', theme: '红绿之间', title: '登栖霞寺峰怀望', author: '李绅',
    lines: ['林叶脱红影，', '竹烟含绿濡。'],
    full: ['香印烟火息，法堂钟磬余。', '纱灯照晨焰，释子安禅居。', '林叶脱红影，竹烟含绿濡。', '疎星珠错落，耀月宇参差。'],
    note: '红与绿同时在场，这就是十月底的栖霞：不是全山一起红。', source: '《摄山志》卷六·诗，第 520 页', caveat: '' },
  { id: 'huang', theme: '山中茶事', title: '送陆鸿渐栖霞寺采茶', author: '皇甫冉',
    lines: ['布叶春风暖，', '盈筐白日斜。'],
    full: ['采茶非采菜，逺远上层厓。', '布叶春风暖，盈筐白日斜。', '旧知山寺路，时宿野人家。'],
    note: '采茶等春，赏枫等秋，同一座山两季的等待方式。', source: '《摄山志》卷六·诗，第 519 页', caveat: '转录待校勘' },
  { id: 'gu', theme: '山寺夜色', title: '栖霞山', author: '顾况',
    lines: ['山僧后夜初入定，', '闻似不闻山月晓。'],
    full: ['栖霞山中子规鸟口邉出血啼不了。', '山僧后夜初入定，闻似不闻山月晓。'],
    note: '山里的声音比景色更留得住。夜游开放以园区公告为准。', source: '《摄山志》卷六·诗，第 520 页', caveat: '转录待校勘' },
  { id: 'xu', theme: '同行', title: '仰同令君栖霞寺山房夜话', author: '徐孝克',
    lines: ['愿言于此处，', '携手屡相逢。'],
    full: ['戒坛青石路，灵相紫金峰。', '影进皈依鸽，餐迎守护龙。', '晨朝宣宝偈，寒夜敛疎钟。', '愿言于此处，携手屡相逢。'],
    note: '一千五百年前的句子，说的是同行的人还会再来。', source: '《摄山志》卷六·诗，第 518 页', caveat: '转录待校勘' },
  { id: 'jiang', theme: '山寺暮色', title: '静卧栖霞寺房望徐祭酒', author: '江总',
    lines: ['连崖夕气合，', '虚宇宿云霾。'],
    full: ['绝俗俗无侣，修心心自斋。', '连崖夕气合，虚宇宿云霾。', '卧藤新接户，欹石久成阶。'],
    note: '傍晚的崖与云，是栖霞寺一带最容易被赶路错过的一段。', source: '《摄山志》卷六·诗，第 512 页', caveat: '' }
]

const cultureTopics = [
  { id: 'heritage', title: '山寺与遗迹', subtitle: '六朝以来，一座山的时间', tag: '栖霞三宝', icon: Landmark, image: '/photos/sheli.jpg',
    description: '南齐明僧绍隐居摄山、舍宅为寺，后来依山开窟造像，栖霞的六朝印记由此开始。',
    sections: [
      { h: '舍宅为寺', p: '明僧绍隐居摄山、舍宅为寺，是栖霞寺与山中佛教空间的起点；此后的开窟造像，让寺院、石窟与碑刻一起进入这座山。' },
      { h: '栖霞三宝', p: '明征君碑、舍利塔、千佛岩合称“栖霞三宝”。明征君碑纪念明僧绍，唐上元三年（676 年）奉敕修建，唐高宗撰文、高正臣书写；舍利塔有隋代始建、南唐重建的层次；千佛岩依山开凿，是江南南朝石窟的重要遗存。' },
      { h: '重修之后的今天', p: '山中建筑经历过毁损、重修与保护，始建年代、重建年代与今天看到的实物常属不同层次。看的时候把它们分开，历史的层次反而更清楚。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；开放范围与讲解以园区公告为准。' },
  { id: 'hongye', title: '红叶与赏枫习俗', subtitle: '“春牛首，秋栖霞”', tag: '市级非遗', icon: Leaf, image: '/photos/hongyegu.jpg',
    description: '红叶不止一种颜色，赏枫也不止一个地方。它连着南京人的秋天。',
    sections: [
      { h: '红叶不只一种', p: '枫香、三角枫、鸡爪槭都是山中的红叶植物。红叶谷在御花园与凤翔峰西南山腰相接的一带，谷内有“铺翠”“揽红”二池与夕佳亭长廊；古道、湖边和亭旁，各有不同视角。' },
      { h: '为什么说秋栖霞', p: '“春牛首，秋栖霞”与南京人的游赏生活相连，清代游记、诗集与《摄山游草》中都留有线索。“栖霞山赏枫习俗”已列入南京市非物质文化遗产代表性项目名录。' },
      { h: '诗文中的红叶', p: '孔尚任写“放目苍崖万丈，拂头红树千枝”。红叶随气温渐次变色，同一面湖水在不同秋日会呈现不同颜色，这也是每年都值得再来的理由。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；当年红度以现场观测为准。' },
  { id: 'xinggong', title: '乾隆行宫与遗址', subtitle: '六下江南，五次驻跸', tag: '遗址尚存', icon: Map, image: '/photos/qixiasi.jpg',
    description: '行宫主体建筑已不存，桥、墙基与柱础还在山中，成为辨认旧日空间的线索。',
    sections: [
      { h: '六到栖霞', p: '乾隆六下江南、六到栖霞山，五次驻跸栖霞行宫。首次南巡时行宫尚未建成，从第二次南巡起，这里成为他在南京的驻跸地之一。' },
      { h: '行宫原来的空间', p: '行宫依山布置，采用前朝后寝的格局。春雨桥、万松山房、千佛岩纱帽峰与畅观亭，是认识这片空间的方位线索。' },
      { h: '今天留下的线索', p: '古桥、部分墙基、柱础与排水遗迹仍在。春雨桥跨中峰涧，连着行宫外墙与内外通道；小营盘遗址地势较高，可俯瞰行宫及周边，让人看见宫殿之外的驻军生活。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；遗址范围与保护要求以园区公告为准。' },
  { id: 'tea', title: '陆羽与泉水茶文化', subtitle: '布叶春风暖，盈筐白日斜', tag: '泉与题刻', icon: BookOpen, image: '/photos/taohuajian.jpg',
    description: '山路、泉水与友人往来，把茶事留在了这座山里。',
    sections: [
      { h: '山中采茶', p: '陆羽在栖霞山采茶、试茶、品茶的故事，连着山路与泉水。皇甫冉《送陆鸿渐栖霞寺采茶》写“布叶春风暖，盈筐白日斜”，又写到“时宿野人家”。' },
      { h: '白鹿泉与试茶亭', p: '白鹿泉遗址与行宫空间相关；“白乳泉试茶亭”则是摩崖题刻上的文字，摩崖上可以直接辨认字迹。' },
      { h: '品外泉与珍珠泉', p: '品外泉得名于陆羽品泉的旧事：泉水很好，却未列入品评，因而称“品外”。珍珠泉连着旧泉眼、题字、桃花湖与后来的亭景。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；茶庄营业与体验项目以现场为准。' },
  { id: 'geology', title: '地质与古海洋', subtitle: '石头里的时间，比人更早', tag: '栖霞组', icon: Mountain, image: '/photos/ximen.jpg',
    description: '“栖霞组”“栖霞灰岩”让这座山与地质研究相连，山石记录着远早于人物的时间。',
    sections: [
      { h: '一座山里的古海洋', p: '栖霞山的自然内容还包括岩石、地层与化石。今天看到的山石，记录着比建筑和人物更早的时间。' },
      { h: '青锋剑石的两种讲述', p: '民间传说说它是乾隆佩剑所化；从地质看，是燧石与石灰岩风化速度不同，较耐风化的部分显露出来，形成眼前的黑色条纹。传说记下人们怎样给自然命名，地质解释眼前的形态。' },
      { h: '化石与地质图', p: '叠浪岩的层理记录自然变化，明征君碑的石材中可见海百合茎化石。1932 年，李四光等人在栖霞山开展地质调查并绘制地质图。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；野外地层观察请勿敲击采集。' },
  { id: 'town', title: '栖霞老街与古镇', subtitle: '山门之外的市井', tag: '宋元有市', icon: Clock3, image: '/photos/qixiasi.jpg',
    description: '游客从古镇进山，游山之后又回到街巷——山上的文化因此留在日常里。',
    sections: [
      { h: '山前的集市', p: '宋元时期，山前已有“栖霞市”的记载；到了明清，栖霞街出现在游记中，成为人们进山游览的一段路。九乡河、栖霞桥与御龙桥记忆，构成山前的历史空间。' },
      { h: '手艺与行当', p: '老街居民中，有以錾石为业的人。山中的石料、碑刻与游览活动，又连着石匠、拓碑与向导等行当；1914 年黄炎培来访时，由李祯祥担任向导。' },
      { h: '茶肆与往来', p: '徐十郎茶肆与山前的饮茶生活相连。山中采茶、泉边试茶、街上饮茶，是这片地方生活的不同侧面。' }
    ],
    status: '内容据《栖霞山文化故事资料》整理；古镇业态以商户实际经营为准。' }
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
// 观测时间显示为 10-31 16:20，避免 ISO 字符串直出
const formatObserved = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
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
            <div class="foliage-context"><h3>{{ foliageContext?.summary || '等待官方信息更新' }}</h3><p>发布于 {{ publicationDate }}<br />{{ foliageContext?.scope }}</p><!-- 待官方查证，暂隐藏：实地采风字段说明
<p v-if="foliageContext?.fieldReport" class="bulletin-field-note"><b>{{ foliageContext.fieldReport.observationPeriod }} · 实地采风</b><br />{{ foliageContext.fieldReport.summary }}。{{ foliageContext.fieldReport.scope }}</p>
--><a v-if="foliageContext" :href="foliageContext.reference.url" target="_blank" rel="noopener noreferrer"><ExternalLink :size="14" />查看官方枫情预报</a><small v-if="!recentBulletin">这是一条历史发布记录，不代表当前枫况。</small></div>
          </div>
          <!-- 待官方查证，暂隐藏：采风观察结论条
<div v-if="foliageContext?.fieldReport" class="field-observation"><ScenicIcon :size="21" filled /><div><b>以绿为主，少量微黄</b><p>{{ foliageContext.fieldReport.observationPeriod }} · 采风观察，未按点位统计</p></div></div>
-->
        </article>
        <article v-else class="current-season-card"><component :is="theme.icon" :size="36" /><div><h2>{{ theme.leafStage }}</h2><p>{{ theme.description }}</p></div><button class="text-btn" @click="snapshotOpen = true">查看秋季发布记录<ArrowRight :size="15" /></button></article>
        <div class="foliage-quick-actions"><button class="primary-btn" @click="selectNav('map')"><Map :size="17" />查看地图与设施</button><button class="outline-btn" @click="selectNav('chat')"><Send :size="16" />询问枫况</button></div>
      </section>
      <section v-if="nav === 'map'" class="content-section map-page paper-wash">
        <div class="map-page-heading"><h2>地图服务</h2></div>
        <div class="map-layout" :class="{ 'without-routes': !recommendedRoutes.length }"><ScenicMap ref="scenicMap" :pois="pois" :facilities="facilities" :shuttle-routes="shuttleRoutes" @select-poi="id => { const poi = pois.find(item => item.id === id); if (poi) showPoi(poi) }" @notice="value => toast = value"><template #map-controls><div class="toolbar map-controls-below"><div class="segmented" role="tablist" aria-label="路线偏好"><button v-for="(label, key) in audienceLabels" :key="key" role="tab" :aria-selected="audience === key" :class="{ active: audience === key }" @click="chooseAudience(key)">{{ label }}</button></div><div class="toolbar-actions"><button class="outline-btn" @click="scenicMap?.reset()"><MapPin :size="17" />回到栖霞山</button><button class="outline-btn" @click="scenicMap?.locate()"><LocateFixed :size="17" />使用我的位置</button></div></div></template></ScenicMap><div v-if="recommendedRoutes.length" class="route-list"><div class="list-heading"><span>推荐路线</span><small>{{ recommendedRoutes.length }} 条 · {{ audienceLabels[audience] }}</small></div><article v-for="route in recommendedRoutes" :key="route.id" class="route-ticket" v-reveal tabindex="0" role="button" :aria-label="`查看${route.name}详情`" @click="showRoute(route)" @keydown.enter="showRoute(route)" @keydown.space.prevent="showRoute(route)"><img v-image-fade :src="route.image" alt="" /><div class="ticket-content"><span class="ticket-kicker">ROUTE</span><h3>{{ route.name }}</h3><div class="route-meta"><span><Clock3 :size="14" />{{ route.duration }}</span><span><Mountain :size="14" />{{ route.difficulty }}</span></div><p>{{ route.reason }}</p><button class="text-btn">查看路线详情 <ArrowRight :size="15" /></button></div></article><div v-if="!recommendedRoutes.length" class="empty-state"><AlertTriangle :size="20" /><b>暂无推荐路线</b><span>可切换园区导览图查阅图面信息，出行前向园区确认现场路况。</span></div></div></div>
      </section>

      <section v-if="nav === 'maple'" class="content-section maple-section">
        <div class="section-heading compact"><span class="kicker">MAPLE CONDITION</span><h2>枫况记录</h2></div>
        <div class="leaf-stage-guide"><span><ScenicIcon class="leaf-green" :size="22" filled />青绿生长</span><span><ScenicIcon class="leaf-yellow" :size="22" filled />黄绿渐染</span><span><ScenicIcon class="leaf-red" :size="22" filled />红叶渐盛</span><small>叶色示意，不作转红日期预测</small></div>
        <button v-if="season !== 'autumn' && maple.length" class="outline-btn archive-toggle" :aria-expanded="archiveOpen" @click="archiveOpen = !archiveOpen"><ScenicIcon :size="20" />{{ archiveOpen ? '收起秋季档案' : '查看秋季记录' }}</button><div v-if="season === 'autumn' && maple.length" class="interest-bar"><span>你更想看</span><button v-for="(label, key) in interestLabels" :key="key" :class="{ active: interest === key }" @click="interest = interest === key ? null : key">{{ label }}</button><small>可跳过</small></div>
        <TransitionGroup name="cards" tag="div" class="maple-grid"><article v-for="record in displayMaple" :key="record.poiId" class="maple-card" v-reveal tabindex="0" role="button" :aria-label="`查看${record.poi?.name}枫况详情`" @click="showMaple(record)" @keydown.enter="showMaple(record)" @keydown.space.prevent="showMaple(record)"><div class="maple-image"><img v-image-fade :src="record.poi?.image" alt="" /></div><div class="maple-body"><span class="kicker">{{ record.poi?.name }}</span><h3>{{ record.stage }}</h3><p>{{ record.density }} · {{ record.view }}</p><LeafProgress v-if="season === 'autumn'" :percent="redPercent(record)" :label="record.poi?.name || '点位'" compact /><p v-else class="archive-note">秋季留影，当前不作红度判断</p><div class="maple-facts"><span><b>观测区间</b>{{ record.redBand }}</span><span><b>观察日期</b>{{ formatObserved(record.observedAt) }}</span></div><!-- 待官方查证，暂隐藏：来源与有效期 --></div></article></TransitionGroup>
        <div v-if="season === 'autumn' && !recommendedMaple.length" class="empty-state"><Leaf :size="24" /><b>暂无枫况记录</b><span>官方发布进度见上方记录。各景点的红叶占比尚未统计，后续按观测更新。</span></div>
        <!-- 待官方查证，暂隐藏：红叶占比口径说明
<div class="coverage-note"><Info :size="18" /><span>官方进度与点位红叶占比口径不同；请结合发布日期和现场叶色查看。</span></div>
-->
      </section>

      <section v-if="nav === 'maple'" class="theme-section">
        <div class="theme-plate">
          <span class="kicker">PARK THEME · 园区核心主题</span>
          <h2 class="theme-line"><span>读一首诗</span><span class="theme-line-red">等一山红</span></h2>
          <p class="theme-lead">栖霞山有两个名字。摄山说的是它能摄生，栖霞说的是它半山落霞。诗写在红之前，红是等出来的——这座山最老的玩法，是先把诗读了，再等它红。</p>
        </div>
        <div class="theme-threads">
          <article v-for="t in narrativeThreads" :key="t.key" class="theme-thread">
            <b>{{ t.glyph }}</b>
            <div><h3>{{ t.label }}</h3><p>{{ t.body }}</p></div>
            <small>{{ t.tag }}</small>
          </article>
        </div>
        <div class="poem-board">
          <div class="poem-board-head"><span class="kicker">POEMS · 摄山志</span><small>《摄山志》卷六·卷七「诗」 · 数据库转录</small></div>
          <figure v-for="poem in poems" :key="poem.id" class="poem-card" :class="{ open: expandedPoem === poem.id }" tabindex="0" role="button" :aria-expanded="expandedPoem === poem.id" @click="togglePoem(poem.id)" @keydown.enter="togglePoem(poem.id)" @keydown.space.prevent="togglePoem(poem.id)">
            <span class="poem-theme">{{ poem.theme }}</span>
            <blockquote><p v-for="line in poem.lines" :key="line">{{ line }}</p></blockquote>
            <figcaption><b>{{ poem.title }}</b><span>{{ poem.author }}</span></figcaption>
            <div v-if="expandedPoem === poem.id" class="poem-full"><p v-for="line in poem.full" :key="line">{{ line }}</p></div>
            <p class="poem-note">{{ poem.note }}</p>
            <small class="poem-source">{{ poem.source }}<template v-if="poem.caveat"> · {{ poem.caveat }}</template></small>
          </figure>
        </div>
        <p class="theme-caveat"><Info :size="15" />诗句据本地《摄山志》数据库转录整理，未经原件校勘；题名、作者、文字与标点以原书为准。泛写红叶与山林的诗句，不必然专写栖霞山。</p>
      </section>
      <section v-if="nav === 'maple'" class="culture-section"><div class="section-heading"><span class="kicker">VISIT INFORMATION</span><h2>游览内容</h2></div><div class="culture-grid"><button v-for="item in cultureTopics" :key="item.id" class="culture-card" v-reveal @click="selectedTopic = item.id"><component :is="item.icon" :size="22" /><span class="culture-copy"><h3>{{ item.title }}</h3><small>{{ item.tag }}</small></span><ArrowRight :size="18" /></button></div></section>

      <section v-if="nav === 'chat'" class="content-section chat-page"><div class="section-heading compact"><span class="kicker">TEXT COMPANION</span><h2>问一句，先把选择变清楚。</h2><!-- 待官方查证，暂隐藏：伴游依据核验说明
<p>伴游依据已发布的结构化信息回答，缺少核验资料时会明确说明。</p>
--></div><div class="chat-panel"><TransitionGroup name="messages" tag="div" class="chat-messages"><div v-for="(item, index) in messages" :key="index" class="chat-line" :class="item.role"><span v-if="item.role === 'assistant'" class="chat-mark"><ScenicIcon :size="19" /></span><p>{{ item.text }}</p></div><div v-if="loading" key="typing" class="chat-line assistant typing"><span class="chat-mark"><RefreshCw :size="14" /></span><p>正在整理信息<span class="typing-dots">…</span></p></div></TransitionGroup><form class="chat-input" @submit.prevent="sendMessage"><input v-model="message" aria-label="输入问题" placeholder="例如：带老人，想了解路线和设施" maxlength="500" /><button class="primary-btn" type="submit" aria-label="发送"><Send :size="18" /></button></form><div class="chat-suggestions"><button @click="message = '带老人，推荐一条路线'">带老人，推荐路线</button><button @click="message = '哪里有厕所？'">哪里有厕所？</button><button @click="message = '现在枫况怎样？'">现在枫况怎样？</button></div></div></section>


      </div></Transition>
      <Transition name="drawer"><section v-if="selectedPoi || selectedRoute || selectedMaple || topic" class="detail-drawer"><button class="drawer-close" aria-label="关闭详情" @click="closeDetail"><X :size="18" /></button><template v-if="topic"><img v-image-fade :src="topic.image" alt="" class="drawer-image" /><span class="kicker">QIXIA CULTURE NOTES</span><h2>{{ topic.title }}</h2><p class="drawer-subtitle">{{ topic.subtitle }}</p><p>{{ topic.description }}</p><div class="topic-sections"><div v-for="sec in topic.sections" :key="sec.h"><h4>{{ sec.h }}</h4><p>{{ sec.p }}</p></div></div><div class="drawer-foot"><p class="drawer-source"><ShieldCheck :size="15" />{{ topic.status }}</p><button class="drawer-action" @click="selectNav('map')">先看地图与服务 <Map :size="16" /></button></div></template><template v-else-if="selectedRoute"><img v-image-fade :src="selectedRoute.image" alt="" class="drawer-image" /><span class="kicker">ROUTE DETAIL</span><h2>{{ selectedRoute.name }}</h2><div class="detail-stats"><span><Clock3 :size="16" />{{ selectedRoute.duration }}</span><span><MapPin :size="16" />{{ selectedRoute.distance }}</span><span><Mountain :size="16" />{{ selectedRoute.difficulty }}</span></div><p>{{ selectedRoute.reason }}</p><h4>路段顺序</h4><div class="stop-line"><span v-for="(stop, i) in selectedRoute.stops" :key="stop"><b>{{ i + 1 }}</b>{{ stop }}</span></div><div class="info-callout"><ShieldCheck :size="18" />{{ selectedRoute.facilities }}</div></template><template v-else-if="selectedPoi"><img v-image-fade :src="selectedPoi.image" alt="" class="drawer-image" /><span class="kicker">POINT OF INTEREST</span><h2>{{ selectedPoi.name }}</h2><p class="drawer-subtitle">{{ selectedPoi.subtitle }}</p><p>{{ selectedPoi.description }}</p><div class="tag-row"><span v-for="tag in selectedPoi.tags" :key="tag">{{ tag }}</span></div><div v-if="selectedMaple" class="maple-detail"><h4>枫况观测</h4><LeafProgress v-if="season === 'autumn'" :percent="redPercent(selectedMaple)" :label="selectedPoi.name" /><p v-else class="archive-note">秋季档案，不代表当前季节状态。</p><div class="detail-stats"><span><b>红度</b>{{ selectedMaple.redBand }}</span><span><b>密度</b>{{ selectedMaple.density }}</span><span><b>视角</b>{{ selectedMaple.view }}</span></div><!-- 待官方查证，暂隐藏：观测时间与有效期 --></div><button class="outline-btn" @click="selectNav('map')">查看关联路线 <ExternalLink :size="16" /></button></template></section></Transition>
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
