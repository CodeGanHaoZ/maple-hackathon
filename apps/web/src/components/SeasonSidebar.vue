<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Palette, RefreshCw, X } from 'lucide-vue-next'
import type { Season } from '../phenology'

const props = defineProps<{ season: Season; options: { id: Season; label: string; icon: Component }[] }>()
const preview = defineModel<Season | null>({ required: true })
const disclosure = ref<HTMLDetailsElement>()
const current = computed(() => props.options.find(item => item.id === (preview.value ?? props.season))!)
function close() {
  if (!disclosure.value) return
  disclosure.value.open = false
  disclosure.value.querySelector('summary')?.focus()
}
</script>

<template>
  <details ref="disclosure" class="season-sidebar" @keydown.esc.stop="close">
    <summary :aria-label="`四季配色，${preview ? '手动' : '自动'}：${current.label}`"><Palette :size="18" /><span>四季</span><small>{{ preview ? '手动' : '自动' }}</small></summary>
    <section class="season-palette" aria-label="四季配色设置">
      <div class="palette-heading"><h2>四季配色</h2><button aria-label="收起四季配色" @click="close"><X :size="18" /></button></div>
      <p>当前时令：{{ options.find(item => item.id === season)?.label }}<br />默认按南京时间自动更新</p>
      <button class="palette-auto" :aria-pressed="preview === null" @click="preview = null"><RefreshCw :size="15" />跟随时令<span>{{ preview === null ? '已开启' : '恢复自动' }}</span></button>
      <span class="palette-label">手动配色</span>
      <div class="palette-options"><button v-for="item in options" :key="item.id" :data-palette="item.id" :aria-pressed="preview === item.id" @click="preview = item.id"><component :is="item.icon" :size="18" /><span>{{ item.label }}</span></button></div>
      <small role="status">{{ preview ? `已使用${current.label}配色，可随时恢复自动。` : '3—5 月春 · 6—8 月夏 · 9—11 月秋 · 12—2 月冬' }}<br />配色随按钮、选项卡和背景一起变化，枫况数据与日期保持原记录。</small>
    </section>
  </details>
</template>
