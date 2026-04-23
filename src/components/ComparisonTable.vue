<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="section-card comparison-card">
    <div class="title-row">
      <h3>标准字段比对</h3>
      <span class="status-text">机器识别字段与标准库逐项比对</span>
    </div>
    <el-table :data="rows" class="app-table" stripe>
      <el-table-column prop="field" label="字段" min-width="140" />
      <el-table-column prop="expected" label="标准字段" min-width="160" />
      <el-table-column prop="actual" label="识别结果" min-width="160" />
      <el-table-column label="比对结论" min-width="120">
        <template #default="{ row }">
          <el-tag :type="row.result === '匹配' ? 'success' : row.result === '不匹配' ? 'danger' : 'warning'">
            {{ row.result }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
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
  align-items: center;
  margin-bottom: 16px;
}

.title-row h3 {
  margin: 0;
}
</style>
