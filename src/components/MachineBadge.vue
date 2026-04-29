<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  score: { type: Number, default: 0 },
})

const config = computed(() => {
  if (props.status === 'pass') return { type: 'success', label: `机器通过 ${props.score}分` }
  if (props.status === 'fail') return { type: 'danger', label: `机器预警 ${props.score}分` }
  if (props.status === 'exception') return { type: 'warning', label: `接口异常 ${props.score}分` }
  return { type: 'warning', label: `待人工确认 ${props.score}分` }
})
</script>

<template>
  <el-tag :type="config.type">{{ config.label }}</el-tag>
</template>
