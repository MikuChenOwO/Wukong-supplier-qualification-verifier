<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import MachineBadge from '../../components/MachineBadge.vue'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatusTag from '../../components/StatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const filters = reactive({
  keyword: '',
  status: '',
  category: '',
  range: [],
})
const keywordInput = reactive({
  value: '',
})

function buildRow(item) {
  const supplier = suppliersStore.currentSupplier(item.supplierId)
  return {
    ...item,
    supplierName: supplier?.enterprise.enterpriseName || '--',
    creditCode: supplier?.enterprise.creditCode || '--',
    contactPhone: supplier?.enterprise.contactPhone || '--',
  }
}

const tableData = computed(() =>
  reviewsStore.enrichedDocuments
    .map(buildRow)
    .filter((item) => {
      const keywordMatched =
        !filters.keyword ||
        normalizeKeyword(item.supplierName).includes(normalizeKeyword(filters.keyword)) ||
        normalizeKeyword(item.creditCode).includes(normalizeKeyword(filters.keyword))
      const statusMatched = !filters.status || item.status === filters.status
      const categoryMatched = !filters.category || item.category === filters.category
      const rangeMatched =
        !filters.range?.length ||
        (new Date(item.uploadedAt) >= new Date(filters.range[0]) &&
          new Date(item.uploadedAt) <= new Date(filters.range[1]))
      return keywordMatched && statusMatched && categoryMatched && rangeMatched
    }),
)

const approvedCount = computed(() => reviewsStore.enrichedDocuments.filter((item) => item.status === 'approved').length)
const pendingCount = computed(() => reviewsStore.enrichedDocuments.filter((item) => item.status === 'pending').length)
const highRiskCount = computed(() => reviewsStore.riskRecords.filter((item) => item.riskStatus.rank >= 3).length)
const notifiedCount = computed(() => reviewsStore.riskRecords.filter((item) => item.notificationState.count > 0).length)

function openDetail(row) {
  router.push(`/admin/reviews/${row.id}`)
}

function applyKeywordSearch() {
  filters.keyword = keywordInput.value.trim()
}

function resetKeywordSearch() {
  keywordInput.value = ''
  filters.keyword = ''
}

function issueCount(row) {
  const compareIssues = (row.comparisons || []).filter((item) => item.result !== '匹配').length
  return (row.riskAlerts?.length || 0) + (row.sameSourceMatches?.length || 0) + compareIssues
}

function hasVeto(row) {
  return (row.riskFlags || []).some((item) => String(item).includes('一票否决'))
}

function sendNotification(row) {
  try {
    reviewsStore.sendRiskNotification({
      recordId: row.id,
      operatorName: authStore.displayName,
      trigger: 'manual',
      mode: 'manual',
    })
    ElMessage.success(`已向 ${row.contactPhone} 发送风险提醒短信。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核列表</h1>
        <p>统一查看文件审核、风险告警和通知状态，并可直接进入审核工作台处理疑点。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="待审核" :value="pendingCount" hint="等待管理员处理的文件数量" />
      <StatCard label="已通过" :value="approvedCount" hint="已归档并锁定的审核结果" tone="success" />
      <StatCard label="高风险文件" :value="highRiskCount" hint="紧急处理与高风险待处理文件" tone="danger" />
      <StatCard label="已发通知" :value="notifiedCount" hint="已自动或人工发送短信提醒的文件" />
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input
          v-model="keywordInput.value"
          placeholder="搜索供应商名称或统一社会信用代码"
          clearable
          style="max-width: 280px"
          @keyup.enter="applyKeywordSearch"
          @clear="resetKeywordSearch"
        />
        <el-button type="primary" plain @click="applyKeywordSearch">搜索</el-button>
        <el-button plain @click="resetKeywordSearch">重置</el-button>
        <el-select v-model="filters.status" placeholder="审核状态" clearable style="width: 160px">
          <el-option label="审核中" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="有条件通过" value="conditional" />
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
        <el-table-column prop="fileName" label="文件名称" min-width="220" />
        <el-table-column label="文件类型" min-width="160">
          <template #default="{ row }">
            {{ standardsStore.documentTypes.find((item) => item.value === row.category)?.label }}
          </template>
        </el-table-column>
        <el-table-column label="上传时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
        </el-table-column>
        <el-table-column label="机器预审" min-width="150">
          <template #default="{ row }">
            <MachineBadge :status="row.machineStatus" :score="row.precheckScore" />
          </template>
        </el-table-column>
        <el-table-column label="审核状态" min-width="110">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="风险状态" min-width="140">
          <template #default="{ row }">
            <RiskStatusTag :status="row.riskStatus" />
          </template>
        </el-table-column>
        <el-table-column label="疑点概览" min-width="180">
          <template #default="{ row }">
            <div class="capsule-list">
              <span class="capsule-item">疑点 {{ issueCount(row) }}</span>
              <el-tag v-if="hasVeto(row)" type="danger">一票否决</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="上传来源" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.uploadSource === 'admin' ? 'warning' : 'info'">
              {{ row.uploadSource === 'admin' ? '管理员代上传' : '供应商上传' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220" fixed="right">
          <template #default="{ row }">
            <div class="toolbar">
              <el-button text type="primary" @click="openDetail(row)">查看详情</el-button>
              <el-button text type="primary" @click="openDetail(row)">进入工作台</el-button>
              <el-button
                v-if="row.riskStatus.code !== 'normal'"
                text
                type="danger"
                @click="sendNotification(row)"
              >
                发送短信
              </el-button>
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

.panel-title {
  margin-bottom: 16px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
}
</style>
