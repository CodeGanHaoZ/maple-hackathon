<script setup lang="ts">
import { computed } from 'vue'
import ScenicIcon from './ScenicIcon.vue'
import { leafCaption, leafColor } from '../phenology'

const props = withDefaults(defineProps<{ percent: number | null; label: string; compact?: boolean; metric?: string; attribution?: string; caption?: string }>(), { compact: false, metric: '红叶占比', attribution: '人工估计' })
const value = computed(() => props.percent === null || !Number.isFinite(props.percent) ? null : Math.max(0, Math.min(100, props.percent)))
const colors = computed(() => ({ '--leaf-tone': leafColor(value.value), '--leaf-ink': leafColor(value.value, true) }))
const fillAt = (index: number) => Math.max(0, Math.min(100, (value.value ?? 0) * 10 - (index - 1) * 100))
</script>

<template>
  <div class="leaf-progress" :class="{ compact, unknown: value === null }" :style="colors" role="progressbar" :aria-label="`${label}${metric}`" :aria-valuenow="value ?? undefined" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="value === null ? '暂无有效观测' : `${metric} ${value}%，${attribution}`">
    <div class="leaf-reading">
      <div class="leaf-specimen" aria-hidden="true"><ScenicIcon :size="compact ? 42 : 68" filled /><span class="specimen-shadow" /></div>
      <div><span class="leaf-reading-label">{{ value === null ? '等待观测' : caption || leafCaption(value) }}</span><div class="leaf-reading-number"><strong>{{ value === null ? '未知' : value }}</strong><span v-if="value !== null">%</span></div></div>
      <small>{{ metric }}<br />{{ attribution }}</small>
    </div>
    <div class="leaf-garland" aria-hidden="true">
      <span v-for="index in 10" :key="index" class="leaf-unit" :style="{ '--leaf-delay': `${index * 45}ms` }">
        <ScenicIcon class="leaf-outline" :size="24" />
        <span class="leaf-unit-fill" :style="{ clipPath: `inset(0 ${100 - fillAt(index)}% 0 0)` }"><ScenicIcon :size="24" filled /></span>
      </span>
    </div>
    <div class="leaf-reading-scale" aria-hidden="true"><span>0% · 青绿</span><span>50% · 渐染</span><span>100% · 枫红</span></div>
    <p v-if="value === null" class="leaf-unknown-note">暂无有效百分比，等待观测更新。</p>
  </div>
</template>
