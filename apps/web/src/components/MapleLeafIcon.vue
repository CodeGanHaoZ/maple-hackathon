<script setup lang="ts">
// 枫叶图标：Material Design Icons — leaf-maple
// 来源 https://pictogrammers.com/library/mdi/icon/leaf-maple/ ，Apache-2.0；内联以避免 CDN 依赖。
// 实心剪影在小尺寸下比线稿更易辨认，故「寻枫」标题使用本图标（线稿枫叶仍用于底部导航）。
withDefaults(defineProps<{ size?: number }>(), { size: 20 })
</script>

<template>
  <svg class="maple-leaf-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M21.79,13L16,16L17,18L13,17.25V21H11V17.25L7,18L8,16L2.21,13L3.21,11.27L1.61,8L5.21,7.77L6.21,6L9.63,9.9L8,5H10L12,2L14,5H16L14.37,9.9L17.79,6L18.79,7.73L22.39,7.96L20.79,11.19L21.79,13Z" />
  </svg>
</template>
