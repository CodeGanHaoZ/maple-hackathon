<script setup lang="ts">
import { computed } from 'vue'
import ScenicIcon from './ScenicIcon.vue'
import { leafCaption, leafColor } from '../phenology'

const props = withDefaults(defineProps<{ percent: number | null; label: string; compact?: boolean }>(), { compact: false })
const value = computed(() => props.percent === null || !Number.isFinite(props.percent) ? null : Math.max(0, Math.min(100, props.percent)))
const colors = computed(() => ({ '--leaf-tone': leafColor(value.value), '--leaf-ink': leafColor(value.value, true) }))
const fillAt = (index: number) => Math.max(0, Math.min(100, (value.value ?? 0) * 10 - (index - 1) * 100))
</script>

<template>
  <div class="leaf-progress" :class="{ compact, unknown: value === null }" :style="colors" role="progressbar" :aria-label="`${label}红叶占比`" :aria-valuenow="value ?? undefined" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="value === null ? '暂无有效观测' : `红叶约占 ${value}%，人工估计`">
    <div class="leaf-reading">
      <div class="leaf-specimen" aria-hidden="true"><ScenicIcon :size="compact ? 42 : 68" filled /><span class="specimen-shadow" /></div>
      <div><span class="leaf-reading-label">{{ value === null ? '等待观测' : leafCaption(value) }}</span><div class="leaf-reading-number"><strong>{{ value === null ? '未知' : value }}</strong><span v-if="value !== null">%</span></div></div>
      <small>红叶占比<br />人工估计</small>
    </div>
    <div class="leaf-garland" aria-hidden="true">
      <span v-for="index in 10" :key="index" class="leaf-unit" :style="{ '--leaf-delay': `${index * 45}ms` }">
        <ScenicIcon class="leaf-outline" :size="24" />
        <span class="leaf-unit-fill" :style="{ clipPath: `inset(0 ${100 - fillAt(index)}% 0 0)` }"><ScenicIcon :size="24" filled /></span>
      </span>
    </div>
    <div class="leaf-reading-scale" aria-hidden="true"><span>青绿</span><span>渐染</span><span>绯红</span></div>
    <p v-if="value === null" class="leaf-unknown-note">暂无有效观测，静候下一次山间来信。</p>
  </div>
</template>
