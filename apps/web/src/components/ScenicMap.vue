<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Armchair, BusFront, Info, MapPin, ParkingCircle, RefreshCw, Toilet } from 'lucide-vue-next'

type Point = { id: string; name: string; coordinates: [number, number] }
type Facility = Point & { kind: string; location: string; note: string; status: string }
type ShuttleRoute = { id: string; name: string; coordinates: [number, number][]; operatingNote: string }
const props = defineProps<{ pois: Point[]; facilities: Facility[]; shuttleRoutes: ShuttleRoute[] }>()
const emit = defineEmits<{ selectPoi: [id: string]; notice: [message: string] }>()
const canvas = ref<HTMLDivElement>()
const key = import.meta.env.VITE_TIANDITU_KEY?.trim()
const state = ref<'loading' | 'ready' | 'unavailable'>(key ? 'loading' : 'unavailable')
const visible = ref<Record<string, boolean>>({ poi: true, toilet: true, shuttle: true, parking: true, rest: false })
const layers = [
  { id: 'poi', label: '景点', icon: MapPin },
  { id: 'toilet', label: '厕所', icon: Toilet },
  { id: 'shuttle', label: '接驳车', icon: BusFront },
  { id: 'parking', label: '停车场', icon: ParkingCircle },
  { id: 'rest', label: '休息点', icon: Armchair }
]
const facilityKind = (kind: string) => kind === 'seat' ? 'rest' : kind
const shownFacilities = computed(() => props.facilities.filter(item => visible.value[facilityKind(item.kind)]))
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
function marker(point: Point, kind: string, detail?: Facility) {
  if (!overlay) return
  const el = document.createElement('div')
  el.className = 'map-popup'
  const heading = document.createElement('strong')
  heading.textContent = point.name
  el.append(heading)
  if (detail) {
    const text = document.createElement('p')
    text.textContent = `${detail.location} · ${detail.status}。${detail.note}`
    el.append(text)
  } else {
    const button = document.createElement('button')
    button.textContent = '查看景点资料'
    button.addEventListener('click', () => emit('selectPoi', point.id))
    el.append(button)
  }
  const icon = L.divIcon({
    className: `scenic-marker marker-${kind}`,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.poi}</svg>`,
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
  if (visible.value.poi) props.pois.forEach(point => marker(point, 'poi'))
  shownFacilities.value.forEach(point => marker(point, facilityKind(point.kind), point))
}
function init() {
  if (!canvas.value || !key) return
  if (timer) clearTimeout(timer)
  map?.remove()
  state.value = 'loading'
  map = L.map(canvas.value, { center: [32.149, 118.961], zoom: 14, minZoom: 3, maxZoom: 18, attributionControl: true, zoomControl: false })
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
function focusFacility(item: Facility) {
  if (map && visible.value[facilityKind(item.kind)]) {
    map.setView([item.coordinates[1], item.coordinates[0]], 16)
    overlay?.eachLayer(layer => { if (layer instanceof L.Marker && layer.options.title === item.name) layer.openPopup() })
  } else emit('notice', `${item.name}：${item.note}`)
}
function locate() {
  if (!navigator.geolocation) { emit('notice', '浏览器不支持定位，可继续浏览设施列表。'); return }
  navigator.geolocation.getCurrentPosition(position => {
    if (!map) { emit('notice', '底图暂不可用，可继续浏览设施列表。'); return }
    const { latitude, longitude } = position.coords
    const color = getComputedStyle(canvas.value!).getPropertyValue('--color-info').trim()
    userMarker?.remove()
    userMarker = L.circleMarker([latitude, longitude], { radius: 8, color, fillOpacity: .7 }).addTo(map).bindPopup('你的位置（仅本次使用）')
    map.setView([latitude, longitude], 15)
    emit('notice', '已显示本次定位；演示点位和站点连线不能用作步行导航。')
  }, () => emit('notice', '未获取到定位，可手动缩放地图或浏览设施列表。'), { timeout: 10000, maximumAge: 60000 })
}
function reset() {
  if (map) { map.closePopup(); map.setView([32.149, 118.961], 14) }
  else emit('notice', '底图暂不可用，可继续浏览设施列表。')
}
defineExpose({ locate, reset })
watch(() => [props.pois, props.facilities, props.shuttleRoutes, visible.value], renderOverlay, { deep: true })
onMounted(init)
onBeforeUnmount(() => { if (timer) clearTimeout(timer); map?.remove() })
</script>

<template>
  <div class="scenic-map-module">
    <div class="map-layer-controls" aria-label="地图图层">
      <button v-for="layer in layers" :key="layer.id" :class="{ active: visible[layer.id] }" :aria-pressed="visible[layer.id]" @click="visible[layer.id] = !visible[layer.id]"><component :is="layer.icon" :size="16" />{{ layer.label }}</button>
    </div>
    <div class="live-map-frame">
      <div ref="canvas" class="live-map" aria-label="天地图栖霞山地图" />
      <div v-if="state === 'loading'" class="map-state"><RefreshCw :size="17" /><span>正在加载天地图…</span></div>
      <div v-if="state === 'unavailable'" class="map-state map-state-error"><Info :size="18" /><div><b>底图暂不可用，设施列表仍可浏览</b><p>{{ key ? '请检查网络及天地图域名授权。' : '配置 VITE_TIANDITU_KEY 后可加载天地图。' }}</p><button v-if="key" class="text-btn" @click="init">重新加载</button></div></div>
      <span class="map-demo-tag">点位 / 接驳连线为演示数据</span>
    </div>
    <div class="map-disclaimer"><Info :size="16" /><span>天地图真实底图 · 站点虚线仅表示顺序，不代表车辆行驶轨迹。设施位置、开放状态及班次待景区核验，不能替代现场导航。底图审图信息以天地图服务公示为准。</span></div>
    <div class="facility-list"><div class="list-heading"><b>先找到需要的服务</b><small>{{ shownFacilities.length }} 个演示点位</small></div><div class="facility-grid"><button v-for="item in shownFacilities" :key="item.id" class="facility-item" @click="focusFacility(item)"><component :is="layers.find(layer => layer.id === facilityKind(item.kind))?.icon || MapPin" :size="19" /><span><b>{{ item.name }}</b><small>{{ item.location }} · {{ item.status }}</small></span><MapPin :size="14" /></button></div><p v-if="!shownFacilities.length" class="facility-empty">开启上方设施图层后，这里会显示对应点位。</p></div>
  </div>
</template>
