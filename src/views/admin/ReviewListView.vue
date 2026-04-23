<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import MachineBadge from '../../components/MachineBadge.vue'
import StatusTag from '../../components/StatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const filters = reactive({
  keyword: '',
  status: '',
  category: '',
  range: [],
})

const tableData = computed(() =>
  reviewsStore.documents
    .map((item) => ({
      ...item,
      supplierName: suppliersStore.currentSupplier(item.supplierId)?.enterprise.enterpriseName,
      creditCode: suppliersStore.currentSupplier(item.supplierId)?.enterprise.creditCode,
    }))
    .filter((item) => {
      const keywordMatched =
        !filters.keyword ||
        normalizeKeyword(item.supplierName).includes(normalizeKeyword(filters.keyword)) ||
        normalizeKeyword(item.creditCode).includes(normalizeKeyword(filters.keyword))
      const statusMatched = !filters.status || item.status === filters.status
      const categoryMatched = !filters.category || item.category === filters.category
      const rangeMatched =
        !filters.range?.length ||
        (new Date(item.uploadedAt) >= new Date(filters.range[0]) && new Date(item.uploadedAt) <= new Date(filters.range[1]))
      return keywordMatched && statusMatched && categoryMatched && rangeMatched
    })
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
)

const approvedCount = computed(() => reviewsStore.documents.filter((item) => item.status === 'approved').length)
const pendingCount = computed(() => reviewsStore.documents.filter((item) => item.status === 'pending').length)
const rejectedCount = computed(() => reviewsStore.documents.filter((item) => item.status === 'rejected').length)

function openDetail(row) {
  router.push(`/admin/reviews/${row.id}`)
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>待审核文件列表</h1>
        <p>按状态、文件类型、时间和企业关键词筛选待办，进入审核工作台执行评分与意见填写。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="待审核" :value="pendingCount" hint="需要管理员处理的文件数量" />
      <StatCard label="已通过" :value="approvedCount" hint="已锁定归档的审核结果" tone="success" />
      <StatCard label="未通过" :value="rejectedCount" hint="等待供应商重新上传" tone="danger" />
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input v-model="filters.keyword" placeholder="搜索供应商名称或统一社会信用代码" clearable style="max-width: 280px" />
        <el-select v-model="filters.status" placeholder="审核状态" clearable style="width: 160px">
          <el-option label="审核中" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="未通过" value="rejected" />
        </el-select>
        <el-select v-model="filters.category" placeholder="文件类型" clearable style="width: 180px">
          <el-option
            v-for="item in standardsStore.documentTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-date-picker
          v-model="filters.range"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />
      </div>
      <el-table :data="tableData" class="app-table" stripe>
        <el-table-column prop="supplierName" label="供应商名称" min-width="220" />
        <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" />
        <el-table-column prop="fileName" label="文件名" min-width="220" />
        <el-table-column label="文件类型" min-width="160">
          <template #default="{ row }">
            {{ standardsStore.documentTypes.find((item) => item.value === row.category)?.label }}
          </template>
        </el-table-column>
        <el-table-column label="上传时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
        </el-table-column>
        <el-table-column label="机器核验" min-width="150">
          <template #default="{ row }">
            <MachineBadge :status="row.machineStatus" :score="row.precheckScore" />
          </template>
        </el-table-column>
        <el-table-column label="审核状态" min-width="110">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="170" fixed="right">
          <template #default="{ row }">
            <div class="toolbar">
              <el-button text type="primary" @click="openDetail(row)">查看详情</el-button>
              <el-button text type="primary" @click="openDetail(row)">进入审核</el-button>
            </div>
          </template>
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
