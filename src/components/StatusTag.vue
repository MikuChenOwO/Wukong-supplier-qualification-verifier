<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
})

const config = computed(() => {
  if (props.status === 'approved') return { type: 'success', label: '已通过' }
  if (props.status === 'conditional') return { type: 'warning', label: '有条件通过' }
  if (props.status === 'rejected') return { type: 'danger', label: '未通过' }
  return { type: 'info', label: '审核中' }
})
</script>

<template>
  <el-tag :type="config.type" effect="dark">{{ config.label }}</el-tag>
</template>
