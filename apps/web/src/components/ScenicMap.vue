<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Armchair, BusFront, Info, MapPin, ParkingCircle, RefreshCw, Toilet, Search, LocateFixed, Coffee, PawPrint, ArrowUpRight } from 'lucide-vue-next'
import MapImageViewer from './MapImageViewer.vue'
import MapleLeafIcon from './MapleLeafIcon.vue'

import { loadMapPlaces, officialPlaceCatalog, distanceMeters, formatDistance, matchRecommendedPlace, type MapPlace, type Coordinates } from '../mapPlaces'

type Point = { id: string; name: string; coordinates: [number, number] }
type Facility = Point & { kind: string; location: string; note: string; status: string }
type ShuttleRoute = { id: string; name: string; coordinates: [number, number][]; operatingNote: string }
const props = defineProps<{ pois: Point[]; facilities: Facility[]; shuttleRoutes: ShuttleRoute[] }>()
const emit = defineEmits<{ selectPoi: [id: string]; notice: [message: string] }>()
const canvas = ref<HTMLDivElement>()
const key = import.meta.env.VITE_TIANDITU_KEY?.trim()
const state = ref<'loading' | 'ready' | 'unavailable'>(key ? 'loading' : 'unavailable')
const referenceMode = ref<'illustrated' | 'guide'>('illustrated')
const recommendedGroups = [
  { id: 'tea', title: '寻茶', icon: Coffee, iconProps: { size: 20 }, places: ['千佛崖', '乾隆行宫遗址', '陆羽茶庄'] },
  { id: 'maple', title: '寻枫', icon: MapleLeafIcon, iconProps: { size: 20 }, places: ['栖霞山山门殿', '彩虹明镜', '中大路', '陆羽茶庄', '凌枫阁', '枫林湖'] },
  { id: 'pet', title: '遛宠', icon: PawPrint, iconProps: { size: 20 }, places: ['彩虹明镜', '桃花湖', '御苑茶园', '始皇临江处'] }
]
const recommendationNotice = ref('')
const visible = ref<Record<string, boolean>>({ poi: true, toilet: true, shuttle: true, parking: true, rest: true, visitor: true })
const providerPlaces = ref<MapPlace[]>([])
const placesLoading = ref(false)
const placesError = ref(false)
const search = ref('')
const userPosition = ref<{ coordinates: Coordinates; accuracy: number; at: number } | null>(null)
const locating = ref(false)
const locationMessage = ref('定位后查看距我的直线距离；位置仅在本页使用。')
let disposed = false
const layers = [
  { id: 'poi', label: '景点', icon: MapPin },
  { id: 'toilet', label: '厕所', icon: Toilet },
  { id: 'shuttle', label: '接驳车', icon: BusFront },
  { id: 'parking', label: '停车场', icon: ParkingCircle },
  { id: 'rest', label: '休息点', icon: Armchair },
  { id: 'visitor', label: '游客中心', icon: Info }
]
const facilityKind = (kind: string) => kind === 'seat' ? 'rest' : kind
const places = computed<MapPlace[]>(() => {
  const published: MapPlace[] = [
    ...props.pois.map(point => ({ ...point, kind: 'poi', location: '', note: '', source: '园区已发布资料' })),
    ...props.facilities.map(point => ({ ...point, kind: facilityKind(point.kind), source: '园区已发布资料' }))
  ]
  return [...published, ...providerPlaces.value.filter(point => !published.some(item => item.name === point.name))]
})
const shownPlaces = computed(() => places.value.filter(item => visible.value[item.kind] && `${item.name}${item.location}`.includes(search.value.trim())).map(item => ({ ...item, distance: userPosition.value ? distanceMeters(userPosition.value.coordinates, item.coordinates) : null })).sort((a, b) => a.distance !== null && b.distance !== null ? a.distance - b.distance : a.name.localeCompare(b.name, 'zh-CN')))
const unmatchedPlaces = computed(() => officialPlaceCatalog.filter(item => visible.value[item.kind] && `${item.name}${item.location}`.includes(search.value.trim()) && !places.value.some(place => place.officialName === item.name)))
const countKind = (kind: string) => places.value.filter(item => item.kind === kind).length
let map: L.Map | undefined
let overlay: L.LayerGroup | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let userMarker: L.CircleMarker | undefined

const paths: Record<string, string> = {
  poi: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  toilet: '<circle cx="8" cy="4" r="1"/><path d="M6 7h4l1 6H5l1-6Zm1 6v7m2-7v7M16 7v13m-2-10 2-3 2 3m-2-7v.01"/>',
  shuttle: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 11h16M8 19v2m8-2v2M8 15h.01M16 15h.01M8 6h8"/>',
  parking: '<circle cx="12" cy="12" r="9"/><path d="M10 17V7h3a3 3 0 0 1 0 6h-3"/>',
  rest: '<path d="M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5M5 15h14M5 18v3m14-3v3"/><path d="M4 10a2 2 0 0 1 2 2v3h12v-3a2 2 0 1 1 4 0v6H2v-6a2 2 0 0 1 2-2Z"/>'
}
function marker(point: MapPlace) {
  if (!overlay) return
  const el = document.createElement('div')
  el.className = 'map-popup'
  const heading = document.createElement('strong')
  heading.textContent = point.name
  el.append(heading)
  for (const text of [point.location, point.source, point.note, userPosition.value ? `距我约 ${formatDistance(distanceMeters(userPosition.value.coordinates, point.coordinates))} · 直线距离` : '定位后查看距我的距离']) {
    const paragraph = document.createElement('p')
    paragraph.textContent = text
    el.append(paragraph)
  }
  if (props.pois.some(poi => poi.id === point.id)) {
    const button = document.createElement('button')
    button.textContent = '查看景点资料'
    button.addEventListener('click', () => emit('selectPoi', point.id))
    el.append(button)
  }
  const icon = L.divIcon({
    className: `scenic-marker marker-${point.kind}`,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[point.kind] || paths.poi}</svg>`,
    iconSize: [36, 36], iconAnchor: [18, 18]
  })
  L.marker([point.coordinates[1], point.coordinates[0]], { icon, title: point.name, alt: point.name }).bindPopup(el).addTo(overlay)
}
function renderOverlay() {
  if (!map || !overlay) return
  overlay.clearLayers()
  if (visible.value.shuttle) {
    const color = getComputedStyle(canvas.value!).getPropertyValue('--indigo-600').trim()
    props.shuttleRoutes.forEach(route => {
      const text = document.createElement('div')
      text.textContent = `${route.name}：${route.operatingNote}。连线仅表示站点顺序。`
      L.polyline(route.coordinates.map(([lng, lat]) => [lat, lng]), { color, weight: 3, dashArray: '7 8' }).bindPopup(text).addTo(overlay!)
    })
  }
  shownPlaces.value.forEach(marker)
}
async function loadPlaces(retry = false) {
  if (!key || placesLoading.value) return
  placesLoading.value = true
  placesError.value = false
  try {
    const result = await loadMapPlaces(key, retry)
    if (disposed) return
    providerPlaces.value = result.places
    placesError.value = result.failures > 0
    reset()
  } catch { if (!disposed) placesError.value = true }
  finally { if (!disposed) placesLoading.value = false }
}
function init() {
  if (!canvas.value || !key) return
  if (timer) clearTimeout(timer)
  map?.stop(); map?.remove()
  state.value = 'loading'
  map = L.map(canvas.value, { center: [32.149, 118.961], zoom: 14, minZoom: 3, maxZoom: 18, attributionControl: true, zoomControl: false, zoomAnimation: false })
  const zoomIcon = (path: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="${path}"/></svg>`
  map.on('popupopen', ({ popup }) => {
    const closeButton = popup.getElement()?.querySelector('.leaflet-popup-close-button')
    if (closeButton) {
      closeButton.setAttribute('aria-label', '关闭地图详情')
      closeButton.innerHTML = zoomIcon('M6 6l12 12M6 18 18 6')
    }
  })
  L.control.zoom({ zoomInText: zoomIcon('M12 5v14M5 12h14'), zoomOutText: zoomIcon('M5 12h14'), zoomInTitle: '放大地图', zoomOutTitle: '缩小地图' }).addTo(map)
  // 天地图 vec_w/cva_w 均为 Web Mercator，坐标使用 API 返回的 WGS84 经纬度。
  const options = { subdomains: '01234567', maxZoom: 18, attribution: '<a href="https://www.tianditu.gov.cn/" target="_blank" rel="noopener noreferrer">天地图</a> · © 自然资源部' }
  const base = L.tileLayer(`https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${encodeURIComponent(key)}`, options).addTo(map)
  L.tileLayer(`https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${encodeURIComponent(key)}`, { ...options, attribution: '' }).addTo(map)
  base.on('tileload', () => { state.value = 'ready'; if (timer) clearTimeout(timer) })
  timer = setTimeout(() => { if (state.value !== 'ready') state.value = 'unavailable' }, 12000)
  overlay = L.layerGroup().addTo(map)
  renderOverlay()
}
function focusFacility(item: MapPlace) {
  if (map && visible.value[item.kind]) {
    map.setView([item.coordinates[1], item.coordinates[0]], 16)
    overlay?.eachLayer(layer => { if (layer instanceof L.Marker && layer.options.title === item.name) layer.openPopup() })
    canvas.value?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  } else emit('notice', `${item.name}：${item.note}`)
}
function findRecommended(name: string) {
  const match = matchRecommendedPlace(name, places.value)
  if (match) {
    search.value = ''; visible.value[match.kind] = true
    recommendationNotice.value = name === match.name ? `已在实际地图中找到：${match.name}` : `导览名称“${name}”对应地图检索地点：${match.name}，请结合园区图核对。`
    requestAnimationFrame(() => focusFacility(match))
  } else recommendationNotice.value = `${name}尚未取得可用坐标，请在上方园区导览图中查阅。`
}
function locate() {
  if (locating.value) return
  if (!navigator.geolocation) { locationMessage.value = '浏览器不支持定位，请继续按名称查找地点。'; return }
  locating.value = true
  locationMessage.value = '正在获取位置…'
  navigator.geolocation.getCurrentPosition(position => {
    if (disposed) return
    locating.value = false
    const { latitude, longitude } = position.coords
    userPosition.value = { coordinates: [longitude, latitude], accuracy: position.coords.accuracy, at: position.timestamp }
    locationMessage.value = `已按距我从近到远排序 · 直线距离 · 定位误差约 ${formatDistance(position.coords.accuracy)} · ${new Date(position.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    if (!map) return
    const color = getComputedStyle(canvas.value!).getPropertyValue('--color-info').trim()
    userMarker?.remove()
    userMarker = L.circleMarker([latitude, longitude], { radius: 8, color, fillOpacity: .7 }).addTo(map).bindPopup('你的位置（仅本次使用）')
    // 用户在园外时保留园区视野，避免地图跳到远处后看不到地标。
    if (distanceMeters([longitude, latitude], [118.961, 32.149]) < 5000) map.setView([latitude, longitude], 15)
  }, error => {
    if (disposed) return
    locating.value = false
    locationMessage.value = error.code === 1 ? '未获定位权限，可在浏览器设置中允许位置后重试。' : error.code === 3 ? '定位超时，请重试；仍可按名称查找地点。' : '暂时无法获取位置，请重试。'
  }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: true })
}
function reset() {
  if (map) {
    map.closePopup()
    if (places.value.length) map.fitBounds(L.latLngBounds(places.value.map(point => [point.coordinates[1], point.coordinates[0]])), { padding: [36, 36], maxZoom: 16 })
    else map.setView([32.149, 118.961], 14)
  }
  else emit('notice', '底图暂不可用，可继续浏览设施列表。')
}
defineExpose({ locate, reset })
watch(() => [shownPlaces.value, props.shuttleRoutes, userPosition.value], renderOverlay, { deep: true })
onMounted(() => { init(); void loadPlaces() })
onBeforeUnmount(() => { disposed = true; if (timer) clearTimeout(timer); map?.stop(); map?.remove() })
</script>

<template>
  <div class="scenic-map-module">
    <section class="actual-map-section" aria-labelledby="actual-map-title">
      <div class="map-section-heading actual-map-heading"><h3 id="actual-map-title">实际地图</h3><small>{{ places.length }} 个地点 · 可点选查看</small></div>
      <div class="map-layer-controls" aria-label="地图图层">
        <button v-for="layer in layers" :key="layer.id" :class="{ active: visible[layer.id] }" :aria-pressed="visible[layer.id]" @click="visible[layer.id] = !visible[layer.id]"><component :is="layer.icon" :size="16" />{{ layer.label }}<small>{{ countKind(layer.id) }}</small></button>
      </div>
      <div class="live-map-frame">
        <div ref="canvas" class="live-map" aria-label="栖霞山实际地图" />
        <div v-if="state === 'loading'" class="map-state"><RefreshCw :size="17" /><span>正在加载实际地图…</span></div>
        <div v-if="state === 'unavailable'" class="map-state map-state-error"><Info :size="18" /><div><b>底图暂不可用，设施列表仍可浏览</b><p>{{ key ? '请检查网络后重试。' : '实际地图服务暂未配置，请先查看园区导览图。' }}</p><button v-if="key" class="text-btn" @click="init">重新加载</button></div></div>
      </div>
      <slot name="map-controls" />
      <div class="location-status" role="status"><LocateFixed :size="16" /><span>{{ locationMessage }}</span><button class="text-btn" :disabled="locating" @click="locate">{{ locating ? '定位中' : userPosition ? '更新位置' : '定位' }}</button></div>
      <div class="facility-list">
        <div class="list-heading"><b>景点与服务设施</b><small>{{ shownPlaces.length }} 个地图点位</small></div>
        <label class="place-search"><Search :size="18" /><input v-model="search" type="search" aria-label="搜索景点或设施" placeholder="搜索景点、厕所、停车场" /></label>
        <p v-if="placesLoading" class="places-status" role="status"><RefreshCw :size="16" class="loading-leaf" />正在查找园区地点…</p>
        <p v-else-if="placesError || !key" class="places-status" role="status">{{ !key ? '地图地点服务暂未配置。' : places.length ? '部分地点未能加载，已加载的地点仍可查看。' : '地点服务暂不可用，请查阅下方地点目录与园区图，或稍后重试。' }}<button v-if="key" class="text-btn" @click="loadPlaces(true)">重新加载地点</button></p>
        <TransitionGroup name="place" tag="div" class="facility-grid"><button v-for="item in shownPlaces" :key="item.id" class="facility-item" @click="focusFacility(item)"><component :is="layers.find(layer => layer.id === item.kind)?.icon || MapPin" :size="21" /><span class="place-copy"><b>{{ item.name }}</b><small>{{ item.location }}</small><!-- 待官方查证，暂隐藏：地点来源标注 --></span><span class="place-distance"><b>{{ item.distance === null ? '—' : formatDistance(item.distance) }}</b><small>{{ item.distance === null ? '待定位' : '距我 · 直线' }}</small></span></button></TransitionGroup>
        <p v-if="!placesLoading && !shownPlaces.length" class="facility-empty">{{ places.length ? '当前筛选没有匹配地点，请调整图层或搜索词。' : '暂未取得可用坐标，请先查阅下方官方地点目录与导览图。' }}</p>
        <!-- 待官方查证，暂隐藏：官方小程序待匹配坐标目录
<details v-if="unmatchedPlaces.length" class="official-place-directory"><summary>官方小程序地点目录 · {{ unmatchedPlaces.length }} 个待匹配坐标</summary><div v-for="item in unmatchedPlaces" :key="item.name" class="unmatched-place"><span><b>{{ item.name }}</b><small>{{ item.location }}</small></span><small>坐标待匹配</small></div></details>
-->
      </div>
      <!-- 待官方查证，暂隐藏：地图坐标与距离口径说明
<div class="map-disclaimer"><Info :size="16" /><span>坐标来自实际地图地点检索，地点目录参考官方小程序。距离按本次定位计算，为直线距离，非步行路程。开放状态以现场为准；未取得坐标的地点不标点，接驳站不表示车辆实时位置。</span></div>
-->
    </section>
    <div class="map-reference-section">
      <div class="map-section-heading"><div><span class="kicker">PARK MAPS</span><h3>园区地图参考</h3></div><div class="map-mode-controls" role="tablist" aria-label="园区参考地图">
        <button role="tab" :aria-selected="referenceMode === 'illustrated'" :class="{ active: referenceMode === 'illustrated' }" @click="referenceMode = 'illustrated'">插画赏秋图</button>
        <button role="tab" :aria-selected="referenceMode === 'guide'" :class="{ active: referenceMode === 'guide' }" @click="referenceMode = 'guide'">园区导览图</button>
      </div></div>
      <div v-if="referenceMode === 'illustrated'" class="map-reference-panel">
        <MapImageViewer src="/assets/maps/qixia-illustrated.png" alt="栖霞山插画赏秋地图" label="栖霞山插画赏秋地图" />
        <!-- 待官方查证，暂隐藏：插画地图配准说明
<p class="map-disclaimer"><Info :size="16" />用户提供的插画地图参考。图上位置用于观览，不与实际地图坐标配准。</p>
-->
      </div>
      <div v-else class="map-reference-panel">
        <MapImageViewer src="/assets/maps/qixia-guide.png" alt="栖霞山园区导览图，含园区道路与设施图例" label="栖霞山园区导览图" />
        <!-- 待官方查证，暂隐藏：园区导览图发布日期说明
<p class="map-disclaimer"><Info :size="16" />园区导览图用于查阅道路和设施图例；图面信息的发布日期及当前运营状态尚待园区确认。</p>
-->
      </div>
    </div>
    <section class="map-recommendations" aria-labelledby="recommendation-title">
      <div class="map-section-heading"><h3 id="recommendation-title">推荐地点</h3><small class="section-note">参考园区导览折页</small></div>
      <div class="recommendation-grid"><article v-for="group in recommendedGroups" :key="group.id" class="recommendation-card">
        <h4><component :is="group.icon" v-bind="group.iconProps" />{{ group.title }}</h4>
        <div class="recommendation-places"><button v-for="name in group.places" :key="name" @click="findRecommended(name)">{{ name }}<ArrowUpRight :size="14" /></button></div>
      </article></div>
      <p v-if="recommendationNotice" class="recommendation-notice" role="status"><Info :size="16" />{{ recommendationNotice }}</p>
      <p class="map-disclaimer"><Info :size="16" />点击地点可查找实际地图位置。折页名称与地图名称可能不同；“遛宠”为折页推荐分类，具体可进入区域及携宠规则请向园区确认。</p>
    </section>
  </div>
</template>
