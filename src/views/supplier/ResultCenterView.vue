<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatusTag from '../../components/StatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { formatDate, formatDateTime, normalizeKeyword } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const filters = reactive({
  keyword: '',
  status: '',
  appealableOnly: false,
})

const resultRecords = computed(() =>
  reviewsStore.recordsBySupplier(authStore.userId).filter((item) => item.status !== 'pending'),
)

const filteredRecords = computed(() =>
  resultRecords.value.filter((item) => {
    const keywordMatched =
      !filters.keyword ||
      normalizeKeyword(item.fileName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.taskNo).includes(normalizeKeyword(filters.keyword))
    const statusMatched = !filters.status || item.status === filters.status
    const appealableMatched = !filters.appealableOnly || item.appealable
    return keywordMatched && statusMatched && appealableMatched
  }),
)

const approvedCount = computed(() => resultRecords.value.filter((item) => item.status === 'approved').length)
const conditionalCount = computed(() => resultRecords.value.filter((item) => item.status === 'conditional').length)
const rejectedCount = computed(() => resultRecords.value.filter((item) => item.status === 'rejected').length)
const appealableCount = computed(() => resultRecords.value.filter((item) => item.appealable).length)
const appealSampleRecords = computed(() =>
  resultRecords.value
    .filter((item) => item.appealable && (item.appealSceneTitle || item.unmetClauses?.length || item.improvementSuggestions?.length))
    .slice(0, 3),
)
const appealCount = computed(() => reviewsStore.appealsBySupplier(authStore.userId).length)

const focusRecord = computed(() => {
  const targetId = String(route.query.recordId || '')
  return filteredRecords.value.find((item) => item.id === targetId) || filteredRecords.value[0]
})
const focusAppeal = computed(() => (focusRecord.value ? reviewsStore.latestAppealByRecord(focusRecord.value.id) : undefined))

watch(
  () => route.query.recordId,
  () => {
    if (route.query.appealable === '1') {
      filters.appealableOnly = true
    }
  },
  { immediate: true },
)

function openDetail(row) {
  router.push(`/supplier/records/${row.id}`)
}

function appealStatusLabel(status) {
  return {
    submitted: '已提交',
    under_review: '复核中',
    supplement_required: '待补充材料',
    accepted: '申诉成立',
    rejected: '申诉驳回',
    closed: '已结案',
  }[status] || '未知状态'
}

function openAppealEntry(row) {
  router.push({
    path: '/supplier/appeals',
    query: {
      recordId: row.id,
    },
  })
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>结果与申诉中心</h1>
        <p>集中查看审核结论、未满足条款、改进建议和申诉资格，后续申诉提交也会从这里进入。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="已通过" :value="approvedCount" hint="已完成审核并通过的文件" tone="success" />
      <StatCard label="有条件通过" :value="conditionalCount" hint="需要按意见继续补强的文件" />
      <StatCard label="未通过" :value="rejectedCount" hint="需整改或重新补传的文件" tone="danger" />
      <StatCard label="可申诉" :value="appealableCount" hint="允许发起申诉的审核结果" tone="warning" />
    </div>

    <div v-if="appealSampleRecords.length" class="section-card panel-card">
      <div class="panel-title">
        <div>
          <h3>申诉场景样例</h3>
          <p>这里放了几种更贴近真实业务的 mock 场景，便于你直接演示供应商为什么会发起申诉。</p>
        </div>
      </div>
      <div class="appeal-sample-grid">
        <button
          v-for="item in appealSampleRecords"
          :key="`sample-${item.id}`"
          type="button"
          class="appeal-sample-item"
          @click="router.replace({ path: '/supplier/results', query: { recordId: item.id, appealable: item.appealable ? '1' : '0' } })"
        >
          <div class="appeal-sample-head">
            <strong>{{ item.appealSceneTitle || item.fileName }}</strong>
            <StatusTag :status="item.status" />
          </div>
          <p>{{ item.appealSceneSummary || item.adminOpinion }}</p>
          <span>{{ item.fileName }}</span>
        </button>
      </div>
    </div>

    <div class="content-grid result-grid">
      <div class="section-card panel-card">
        <div class="toolbar" style="margin-bottom: 16px">
          <el-input v-model="filters.keyword" placeholder="搜索文件名或任务号" clearable style="max-width: 260px" />
          <el-select v-model="filters.status" placeholder="审核结论" clearable style="width: 160px">
            <el-option label="已通过" value="approved" />
            <el-option label="有条件通过" value="conditional" />
            <el-option label="未通过" value="rejected" />
          </el-select>
          <el-checkbox v-model="filters.appealableOnly">仅看可申诉</el-checkbox>
        </div>

        <div class="result-list">
          <button
            v-for="item in filteredRecords"
            :key="item.id"
            type="button"
            class="result-item"
            :class="{ active: focusRecord?.id === item.id }"
            @click="router.replace({ path: '/supplier/results', query: { recordId: item.id, appealable: item.appealable ? '1' : '0' } })"
          >
            <div class="result-item-head">
              <strong>{{ item.fileName }}</strong>
              <StatusTag :status="item.status" />
            </div>
            <div class="result-item-meta">
              <span>{{ standardsStore.documentTypes.find((type) => type.value === item.category)?.label }}</span>
              <span>{{ formatDateTime(item.reviewedAt || item.uploadedAt) }}</span>
            </div>
            <div class="result-item-foot">
              <RiskStatusTag :status="item.riskStatus" />
              <el-tag :type="item.appealable ? 'warning' : 'info'">{{ item.appealable ? '可申诉' : '不可申诉' }}</el-tag>
            </div>
          </button>
        </div>

        <div v-if="!filteredRecords.length" class="rich-empty">当前没有符合条件的审核结果。</div>
      </div>

      <div class="section-card panel-card detail-panel">
        <template v-if="focusRecord">
          <div class="panel-title">
            <div>
              <h3>结果详情</h3>
              <p>{{ focusRecord.fileName }}</p>
            </div>
            <StatusTag :status="focusRecord.status" />
          </div>

          <div class="metric-row">
            <span>任务号</span>
            <strong>{{ focusRecord.taskNo }}</strong>
          </div>
          <div class="metric-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(focusRecord.reviewedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>审核人</span>
            <strong>{{ focusRecord.reviewerName || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>审核意见</span>
            <strong>{{ focusRecord.adminOpinion || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>申诉资格</span>
            <strong>{{ focusRecord.appealable ? `可申诉，截止 ${formatDate(focusRecord.appealDeadline)}` : '当前不可申诉' }}</strong>
          </div>
          <div class="metric-row">
            <span>申诉进展</span>
            <strong>{{ focusAppeal ? `${appealStatusLabel(focusAppeal.status)}｜${formatDateTime(focusAppeal.updatedAt || focusAppeal.submittedAt)}` : '尚未提交申诉' }}</strong>
          </div>

          <div v-if="focusAppeal?.latestFeedback" class="detail-block">
            <div class="section-subtitle">最新申诉反馈</div>
            <div class="suggestion-item">{{ focusAppeal.latestFeedback }}</div>
          </div>

          <div v-if="focusRecord.appealSceneTitle || focusRecord.appealSceneSummary" class="detail-block">
            <div class="section-subtitle">申诉场景示例</div>
            <div class="suggestion-item">
              <strong>{{ focusRecord.appealSceneTitle || '申诉场景说明' }}</strong>
              <p class="detail-paragraph">{{ focusRecord.appealSceneSummary || '当前记录未补充更多场景说明。' }}</p>
            </div>
          </div>

          <div v-if="focusRecord.unmetClauses?.length" class="detail-block">
            <div class="section-subtitle">未满足条款</div>
            <div class="capsule-list">
              <span v-for="item in focusRecord.unmetClauses" :key="item" class="capsule-item">{{ item }}</span>
            </div>
          </div>

          <div v-if="focusRecord.improvementSuggestions?.length" class="detail-block">
            <div class="section-subtitle">改进建议</div>
            <div class="suggestion-list">
              <div v-for="item in focusRecord.improvementSuggestions" :key="item" class="suggestion-item">{{ item }}</div>
            </div>
          </div>

          <div v-if="String(route.query.action || '') === 'appeal'" class="appeal-entry-box">
            <div>
              <strong>申诉提交已接通</strong>
              <p>当前账号已有 {{ appealCount }} 条申诉记录。你可以直接进入申诉页填写说明、上传材料，并持续查看处理状态。</p>
            </div>
            <div class="toolbar">
              <el-button type="primary" @click="openAppealEntry(focusRecord)">提交申诉材料</el-button>
              <el-button plain @click="openDetail(focusRecord)">查看原记录详情</el-button>
            </div>
          </div>

          <div v-else class="toolbar" style="margin-top: 18px">
            <el-button type="primary" @click="openDetail(focusRecord)">查看原记录详情</el-button>
            <el-button
              v-if="focusRecord.appealable"
              type="warning"
              plain
              @click="openAppealEntry(focusRecord)"
            >
              发起申诉
            </el-button>
          </div>
        </template>

        <div v-else class="rich-empty">请选择一条审核结果查看详情。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-grid {
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.05fr);
  align-items: start;
}

.panel-card {
  padding: 20px;
}

.detail-panel {
  position: sticky;
  top: 0;
}

.appeal-sample-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.appeal-sample-item {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 252, 245, 0.9);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.appeal-sample-item:hover {
  border-color: rgba(194, 134, 16, 0.35);
  box-shadow: 0 10px 24px rgba(151, 108, 27, 0.08);
  transform: translateY(-1px);
}

.appeal-sample-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.appeal-sample-item p {
  margin: 10px 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.appeal-sample-item span,
.detail-paragraph {
  color: var(--text-muted);
  line-height: 1.7;
}

.result-list {
  display: grid;
  gap: 12px;
}

.result-item {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.9);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.result-item:hover,
.result-item.active {
  border-color: rgba(31, 115, 216, 0.35);
  box-shadow: 0 10px 24px rgba(24, 64, 116, 0.08);
  transform: translateY(-1px);
}

.result-item-head,
.result-item-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.result-item-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
}

.detail-block + .detail-block {
  margin-top: 14px;
}

.section-subtitle {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.suggestion-list {
  display: grid;
  gap: 8px;
}

.suggestion-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.appeal-entry-box {
  margin-top: 18px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(194, 134, 16, 0.25);
  background: rgba(255, 248, 230, 0.82);
}

.appeal-entry-box p {
  margin: 8px 0 14px;
  color: var(--text-muted);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .appeal-sample-grid {
    grid-template-columns: 1fr;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }
}
</style>
