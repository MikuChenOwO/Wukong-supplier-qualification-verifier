<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useReviewsStore } from '../../stores/reviews'
import { downloadBlob, formatDateTime, normalizeKeyword } from '../../utils/format'

const reviewsStore = useReviewsStore()
const keyword = ref('')

const logRows = computed(() =>
  reviewsStore.reviewLogs.filter((item) => {
    if (!keyword.value) return true
    const key = normalizeKeyword(keyword.value)
    return (
      normalizeKeyword(item.supplierName).includes(key) ||
      normalizeKeyword(item.fileName).includes(key) ||
      normalizeKeyword(item.reviewer).includes(key)
    )
  }),
)

function exportExcel() {
  const header = ['任务号', '供应商名称', '文件名', '审核人', '审核动作', '审核结果', '得分', '审核意见', '审核时间']
  const rows = logRows.value.map((item) => [
    item.taskNo,
    item.supplierName,
    item.fileName,
    item.reviewer,
    item.action,
    item.result,
    item.score,
    item.comment,
    formatDateTime(item.reviewedAt),
  ])
  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  downloadBlob(new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }), '悟空审核日志导出.csv')
  ElMessage.success('已导出 Excel 兼容的 Mock CSV。')
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核日志</h1>
        <p>集中保留审核、申诉提交、申诉复核、补件与结案等全流程记录，并支持 Mock 导出 Excel。</p>
      </div>
      <el-button type="primary" @click="exportExcel">导出 Excel</el-button>
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input v-model="keyword" placeholder="搜索供应商、文件名或审核人" clearable style="max-width: 280px" />
      </div>
      <el-table :data="logRows" class="app-table" stripe>
        <el-table-column prop="taskNo" label="任务号" min-width="140" />
        <el-table-column prop="supplierName" label="供应商名称" min-width="220" />
        <el-table-column prop="fileName" label="文件名" min-width="220" />
        <el-table-column prop="reviewer" label="审核人" min-width="140" />
        <el-table-column prop="result" label="结果" min-width="100" />
        <el-table-column prop="score" label="得分" min-width="90" />
        <el-table-column prop="comment" label="审核意见" min-width="220" />
        <el-table-column label="审核时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.reviewedAt) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.table-card {
  padding: 20px;
}
</style>
