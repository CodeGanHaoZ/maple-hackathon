<script setup lang="ts">
withDefaults(defineProps<{ kind?: 'maple' | 'pagoda' | 'guide'; size?: number; filled?: boolean }>(), { kind: 'maple', size: 24, filled: false })
</script>

<template>
  <svg class="scenic-icon" :class="`icon-${kind}`" :width="size" :height="size" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <!-- 枫叶为装饰纹样；官方品牌标识仍使用原 PNG。 -->
    <template v-if="kind === 'maple'">
      <path :fill="filled ? 'currentColor' : 'none'" d="m16 2 3.1 7.2 3-2-.3 5.8 6.5-2.1-2.4 5.3 3.3 1.3-7.7 6.4 1.2 3.8-6.7-2.2-6.7 2.2 1.2-3.8-7.7-6.4 3.3-1.3-2.4-5.3 6.5 2.1-.3-5.8 3 2Z" />
      <path d="m16.3 16-.5 14m.2-7-5-5m5 4 5-5" :class="{ 'leaf-vein-filled': filled }" />
    </template>
    <template v-else-if="kind === 'pagoda'">
      <path d="M16 2v3M12 6h8l3 3H9l3-3ZM10 10v4m12-4v4M8 15h16l4 3H4l4-3Zm1 4v7m14-7v7M5 27h22M3 30h26M13 26v-6h6v6M16 10v4M7 13l-2 2m20-2 2 2" />
    </template>
    <template v-else>
      <path d="M6 6h20v23H6V6Zm0 0L3 9v17l3 3M26 6l3 3v17l-3 3M10 15l4-5 4 4 3-2 3 4" />
      <path d="M11 24c0-3 9-2 9-5 0-1-2-1-3-1m-4 7h.01M12 3h8" />
      <circle cx="12" cy="23" r="1.5" />
    </template>
  </svg>
</template>
