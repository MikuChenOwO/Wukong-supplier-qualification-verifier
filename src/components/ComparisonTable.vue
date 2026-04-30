<script setup>
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  focusMode: { type: String, default: 'all' },
})

function resultMeta(result) {
  if (result === '匹配') {
    return { type: 'success', level: 'match', summary: '字段一致，可直接作为审核参考。' }
  }

  if (result === '不匹配') {
    return { type: 'danger', level: 'mismatch', summary: '字段与标准值不一致，建议优先核对。' }
  }

  return { type: 'warning', level: 'pending', summary: '字段仍需人工确认。' }
}

const stats = computed(() => ({
  total: props.rows.length,
  match: props.rows.filter((item) => resultMeta(item.result).level === 'match').length,
  mismatch: props.rows.filter((item) => resultMeta(item.result).level === 'mismatch').length,
  pending: props.rows.filter((item) => resultMeta(item.result).level === 'pending').length,
}))

const visibleRows = computed(() => {
  if (props.focusMode === 'mismatch') {
    return props.rows.filter((item) => resultMeta(item.result).level === 'mismatch')
  }

  if (props.focusMode === 'pending') {
    return props.rows.filter((item) => resultMeta(item.result).level === 'pending')
  }

  if (props.focusMode === 'match') {
    return props.rows.filter((item) => resultMeta(item.result).level === 'match')
  }

  return props.rows
})

function rowClassName({ row }) {
  return `comparison-row-${resultMeta(row.result).level}`
}
</script>

<template>
  <div class="section-card comparison-card">
    <div class="title-row">
      <div>
        <h3>标准字段比对</h3>
        <span class="status-text">把机器识别结果和标准值逐项展开，方便审核员快速聚焦不一致项和待确认项。</span>
      </div>
      <div class="capsule-list">
        <span class="capsule-item">共 {{ stats.total }} 项</span>
        <span class="capsule-item match">匹配 {{ stats.match }}</span>
        <span class="capsule-item pending">待确认 {{ stats.pending }}</span>
        <span class="capsule-item mismatch">不匹配 {{ stats.mismatch }}</span>
      </div>
    </div>
    <el-table :data="visibleRows" class="app-table" stripe :row-class-name="rowClassName">
      <el-table-column prop="field" label="字段" min-width="140" />
      <el-table-column prop="expected" label="标准值" min-width="180" />
      <el-table-column prop="actual" label="识别结果" min-width="180" />
      <el-table-column label="比对结论" min-width="120">
        <template #default="{ row }">
          <el-tag :type="resultMeta(row.result).type">
            {{ row.result }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核提示" min-width="220">
        <template #default="{ row }">
          <span class="status-text">{{ resultMeta(row.result).summary }}</span>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="!visibleRows.length" class="rich-empty compact-empty">当前筛选条件下没有需要展示的比对项。</div>
  </div>
</template>

<style scoped>
.comparison-card {
  padding: 18px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.title-row h3 {
  margin: 0 0 6px;
}

.capsule-item.match {
  background: rgba(22, 136, 106, 0.12);
  color: var(--success);
}

.capsule-item.pending {
  background: rgba(194, 134, 16, 0.12);
  color: var(--warning);
}

.capsule-item.mismatch {
  background: rgba(197, 63, 79, 0.12);
  color: var(--danger);
}

.compact-empty {
  padding-top: 18px;
}

:deep(.comparison-row-mismatch td) {
  background: rgba(197, 63, 79, 0.06) !important;
}

:deep(.comparison-row-pending td) {
  background: rgba(194, 134, 16, 0.06) !important;
}

@media (max-width: 1024px) {
  .title-row {
    flex-direction: column;
  }
}
</style>
