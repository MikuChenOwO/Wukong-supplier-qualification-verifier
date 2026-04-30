<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: Object,
    required: true,
  },
})

const config = computed(() => ({
  type: props.status?.type || 'info',
  label: props.status?.label || '未识别',
}))
</script>

<template>
  <el-tag :type="config.type">{{ config.label }}</el-tag>
</template>
