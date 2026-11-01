<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Expand, Minus, Plus, RotateCcw, X } from 'lucide-vue-next'

const props = defineProps<{ src: string; alt: string; label: string }>()
const open = ref(false)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const stage = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const pointers = new Map<number, { x: number; y: number }>()
const start = ref<{ x: number; y: number; ox: number; oy: number } | null>(null)
const scaleStyle = computed(() => ({ transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})` }))
const fullscreen = () => Boolean(document.fullscreenElement)
function zoom(next: number) { scale.value = Math.min(5, Math.max(1, next)); if (scale.value === 1) offset.value = { x: 0, y: 0 } }
function reset() { zoom(1); offset.value = { x: 0, y: 0 } }
function move(event: PointerEvent) {
  if (!start.value || !pointers.has(event.pointerId)) return
  const rotated = fullscreen() && matchMedia('(orientation: portrait)').matches
  const dx = event.clientX - start.value.x
  const dy = event.clientY - start.value.y
  offset.value = { x: start.value.ox + (rotated ? dy : dx), y: start.value.oy + (rotated ? -dx : dy) }
}
function pointerDown(event: PointerEvent) {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  start.value = { x: event.clientX, y: event.clientY, ox: offset.value.x, oy: offset.value.y }
}
function pointerUp(event: PointerEvent) { pointers.delete(event.pointerId); start.value = null }
function wheel(event: WheelEvent) { if (event.ctrlKey || scale.value > 1) { event.preventDefault(); zoom(scale.value + (event.deltaY < 0 ? 0.2 : -0.2)) } }
async function enterFullscreen() {
  open.value = true
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
  try { await stage.value?.requestFullscreen(); try { await (screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> }).lock?.('landscape') } catch { /* CSS keeps the map landscape on unsupported devices. */ } } catch { /* Keep the in-page viewer available. */ }
}
async function close() {
  open.value = false
  reset()
  try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* Browser may already have left fullscreen. */ }
  try { screen.orientation?.unlock() } catch { /* Orientation lock is optional. */ }
}
function keyboard(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape' && !document.fullscreenElement) { event.preventDefault(); void close(); return }
  if (event.key !== 'Tab') return
  const buttons = [...(stage.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
  const first = buttons[0], last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function fullscreenChanged() { if (!document.fullscreenElement && open.value) void close() }
watch(open, async value => {
  document.body.classList.toggle('map-viewer-open', value)
  if (value) {
    window.addEventListener('keydown', keyboard)
    document.addEventListener('fullscreenchange', fullscreenChanged)
    await nextTick()
    stage.value?.querySelector<HTMLButtonElement>('button')?.focus()
  } else {
    window.removeEventListener('keydown', keyboard)
    document.removeEventListener('fullscreenchange', fullscreenChanged)
    await nextTick()
    trigger.value?.focus({ preventScroll: true })
  }
})
onBeforeUnmount(() => { document.body.classList.remove('map-viewer-open'); window.removeEventListener('keydown', keyboard); document.removeEventListener('fullscreenchange', fullscreenChanged); if (document.fullscreenElement === stage.value) void document.exitFullscreen() })
</script>

<template>
  <div class="map-image-viewer">
    <button ref="trigger" class="map-image-preview" :aria-label="`放大查看${label}`" @click="open = true"><img :src="src" :alt="alt" /><span><Expand :size="16" />放大查看</span></button>
    <Transition name="fade"><div v-if="open" ref="stage" class="map-image-overlay" role="dialog" aria-modal="true" :aria-label="`${label}全屏查看`" @wheel="wheel">
      <div class="map-viewer-toolbar"><b>{{ label }}</b><div><button aria-label="缩小" title="缩小" @click="zoom(scale - .25)"><Minus :size="18" /></button><button aria-label="放大" title="放大" @click="zoom(scale + .25)"><Plus :size="18" /></button><button aria-label="恢复原始大小" title="恢复原始大小" @click="reset"><RotateCcw :size="18" /></button><button aria-label="全屏查看，优先横屏" title="全屏查看" @click="enterFullscreen"><Expand :size="18" /></button><button aria-label="关闭地图" title="关闭" @click="close"><X :size="18" /></button></div></div>
      <div class="map-viewer-stage" @pointerdown="pointerDown" @pointermove="move" @pointerup="pointerUp" @pointercancel="pointerUp"><img :src="src" :alt="alt" :style="scaleStyle" draggable="false" /></div>
      <p class="map-viewer-caption">{{ label }} · 图片仅供导览参考，未与地图坐标配准</p>
    </div></Transition>
  </div>
</template>
