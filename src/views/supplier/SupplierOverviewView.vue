<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatusTag from '../../components/StatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { formatDate, formatDateTime } from '../../utils/format'

const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const suppliersStore = useSuppliersStore()
const standardsStore = useStandardsStore()

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const records = computed(() => reviewsStore.recordsBySupplier(authStore.userId))
const riskRecords = computed(() => reviewsStore.riskRecordsBySupplier(authStore.userId))
const resultRecords = computed(() => records.value.filter((item) => item.status === 'conditional' || item.status === 'rejected'))
const approvedCount = computed(() => records.value.filter((item) => item.status === 'approved').length)
const conditionalCount = computed(() => records.value.filter((item) => item.status === 'conditional').length)
const pendingCount = computed(() => records.value.filter((item) => item.status === 'pending').length)
const criticalCount = computed(() => riskRecords.value.filter((item) => item.riskStatus.code === 'critical').length)
const notifiedCount = computed(() => riskRecords.value.filter((item) => item.notificationState.count > 0).length)
const appealableCount = computed(() => resultRecords.value.filter((item) => item.appealable).length)
const submittedAppealCount = computed(() => reviewsStore.appealsBySupplier(authStore.userId).length)
const activeRereviewTasks = computed(() =>
  reviewsStore
    .rereviewTasksBySupplier(authStore.userId)
    .filter((item) => item.status === 'pending' || item.status === 'in_progress'),
)
const activeRereviewCount = computed(() => activeRereviewTasks.value.length)
const latestApproved = computed(() => reviewsStore.latestApprovedRecordBySupplier(authStore.userId))
const nextReviewAt = computed(() => latestApproved.value?.nextReviewAt || '')
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
const latestRiskRecords = computed(() => riskRecords.value.slice(0, 4))
const latestResultRecords = computed(() => resultRecords.value.slice(0, 3))
const knowledgeHighlights = computed(() => [
  ...standardsStore.knowledgeBase.slice(0, 2).map((item) => ({
    id: item.id,
    kind: 'FAQ',
    accent: item.category,
    title: item.title,
    summary: item.summary,
  })),
  ...standardsStore.caseLibrary.slice(0, 2).map((item) => ({
    id: item.id,
    kind: '案例',
    accent: item.caseCategory,
    title: item.title,
    summary: item.takeaway,
  })),
])
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商总览</h1>
        <p>集中查看企业档案、审核结果、风险告警和复审进度，方便快速判断当前最需要处理的事项。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="累计资质文件" :value="records.length" hint="当前企业全部上传记录" />
      <StatCard label="审核通过" :value="approvedCount" hint="已通过并归档的文件数量" tone="success" />
      <StatCard label="审核中" :value="pendingCount" hint="等待管理员处理的文件数量" />
      <StatCard label="紧急告警" :value="criticalCount" hint="已过期或触发关键风险的文件" tone="danger" />
      <StatCard label="复审处理中" :value="activeRereviewCount" hint="因风控或资料更新进入复审流转的任务" />
    </div>

    <div class="content-grid two-col">
      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>当前审核任务与模板</h3>
          <el-tag type="warning">{{ currentTemplate?.version || '--' }}</el-tag>
        </div>
        <div class="metric-row">
          <span>企业名称</span>
          <strong>{{ supplier?.enterprise.enterpriseName }}</strong>
        </div>
        <div class="metric-row">
          <span>供应商类型</span>
          <strong>{{ standardsStore.supplierTypes.find((item) => item.value === supplier?.enterprise.supplierType)?.label }}</strong>
        </div>
        <div class="metric-row">
          <span>准入模板</span>
          <strong>{{ currentTemplate?.name }}</strong>
        </div>
        <div class="metric-row">
          <span>准入门槛</span>
          <strong>{{ currentTemplate?.threshold || standardsStore.resolveThreshold(supplier?.enterprise) }} 分</strong>
        </div>
        <div class="metric-row">
          <span>上次通过时间</span>
          <strong>{{ formatDateTime(latestApproved?.reviewedAt || latestApproved?.uploadedAt) }}</strong>
        </div>
        <div class="metric-row">
          <span>预计复评提醒</span>
          <strong>{{ nextReviewAt ? formatDate(nextReviewAt) : '待生成' }}</strong>
        </div>
        <div class="soft-divider" />
        <el-steps :active="pendingCount ? 2 : approvedCount ? 4 : 1" finish-status="success">
          <el-step title="资料准备" />
          <el-step title="机器预审" />
          <el-step title="管理员审核" />
          <el-step title="结果归档" />
        </el-steps>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>告警状态分层</h3>
          <el-tag :type="notifiedCount ? 'warning' : 'success'">{{ notifiedCount ? '已触发通知' : '暂无短信提醒' }}</el-tag>
        </div>
        <div v-if="latestRiskRecords.length" class="risk-list">
          <div v-for="item in latestRiskRecords" :key="item.id" class="risk-item">
            <div class="risk-item-head">
              <strong>{{ item.fileName }}</strong>
              <RiskStatusTag :status="item.riskStatus" />
            </div>
            <p>{{ item.riskAlerts.map((alert) => alert.label).join('、') }}</p>
            <span>通知状态：{{ item.notificationState.label }}</span>
          </div>
        </div>
        <div v-else class="rich-empty">当前暂无风险文件。</div>
        <div class="soft-divider" />
        <div class="capsule-list">
          <span class="capsule-item">正常归档</span>
          <span class="capsule-item">跟进观察</span>
          <span class="capsule-item">重点关注</span>
          <span class="capsule-item">高风险待处理</span>
          <span class="capsule-item">紧急处理</span>
        </div>
      </div>
    </div>

    <div class="content-grid two-col">
      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>结果与申诉入口</h3>
          <el-button text @click="$router.push('/supplier/results')">进入结果中心</el-button>
        </div>
        <div class="result-summary-grid">
          <div class="mini-stat">
            <span>有条件通过</span>
            <strong>{{ conditionalCount }}</strong>
          </div>
          <div class="mini-stat">
            <span>可申诉</span>
            <strong>{{ appealableCount }}</strong>
          </div>
          <div class="mini-stat">
            <span>已提交申诉</span>
            <strong>{{ submittedAppealCount }}</strong>
          </div>
        </div>
        <div v-if="latestResultRecords.length" class="result-preview-list">
          <div v-for="item in latestResultRecords" :key="item.id" class="result-preview-item">
            <div class="result-preview-head">
              <strong>{{ item.fileName }}</strong>
              <StatusTag :status="item.status" />
            </div>
            <p>{{ item.adminOpinion || '请进入详情查看审核意见。' }}</p>
            <div class="toolbar">
              <el-tag :type="item.appealable ? 'warning' : 'info'">{{ item.appealable ? '可申诉' : '不可申诉' }}</el-tag>
              <el-button text type="primary" @click="$router.push(`/supplier/results?recordId=${item.id}`)">查看结论</el-button>
              <el-button v-if="item.appealable" text type="warning" @click="$router.push(`/supplier/appeals?recordId=${item.id}`)">提交申诉</el-button>
            </div>
          </div>
        </div>
        <div v-else class="rich-empty">当前暂无需要重点跟进的审核结果。</div>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>复审与变更跟进</h3>
          <el-tag :type="activeRereviewCount ? 'warning' : 'success'">{{ activeRereviewCount ? '处理中' : '暂无任务' }}</el-tag>
        </div>
        <div v-if="activeRereviewTasks.length" class="result-preview-list">
          <div v-for="item in activeRereviewTasks.slice(0, 3)" :key="item.id" class="result-preview-item">
            <div class="result-preview-head">
              <strong>{{ item.fileName || item.taskNo }}</strong>
              <el-tag :type="item.status === 'pending' ? 'warning' : 'primary'">
                {{ item.status === 'pending' ? '待处理' : '复审中' }}
              </el-tag>
            </div>
            <p>{{ item.reason }}</p>
            <div class="toolbar">
              <span class="status-text">最近更新：{{ formatDateTime(item.updatedAt || item.createdAt) }}</span>
              <el-button text type="primary" @click="$router.push(`/supplier/records/${item.recordId}`)">查看关联文件</el-button>
            </div>
          </div>
        </div>
        <div v-else class="rich-empty">当前暂无正在流转的复审任务。</div>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>最近核验记录</h3>
          <el-button text @click="$router.push('/supplier/records')">查看全部</el-button>
        </div>
        <el-table :data="records.slice(0, 5)" class="app-table" stripe>
          <el-table-column prop="taskNo" label="任务号" min-width="140" />
          <el-table-column prop="fileName" label="文件名称" min-width="200" />
          <el-table-column prop="precheckScore" label="预审分" min-width="90" />
          <el-table-column label="风险状态" min-width="130">
            <template #default="{ row }">
              <RiskStatusTag :status="row.riskStatus" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>帮助与知识库</h3>
          <el-button text @click="$router.push('/supplier/help')">查看全部</el-button>
        </div>
        <div v-for="item in knowledgeHighlights" :key="`${item.kind}-${item.id}`" class="faq-item">
          <div class="knowledge-item-head">
            <strong>{{ item.title }}</strong>
            <el-tag effect="plain" size="small">{{ item.kind }} · {{ item.accent }}</el-tag>
          </div>
          <p>{{ item.summary }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-panel {
  padding: 20px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0;
}

.risk-list {
  display: grid;
  gap: 12px;
}

.result-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.mini-stat {
  padding: 14px;
  border-radius: 16px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.mini-stat span {
  color: var(--text-muted);
  font-size: 13px;
}

.mini-stat strong {
  display: block;
  margin-top: 10px;
  font-size: 28px;
}

.result-preview-list {
  display: grid;
  gap: 12px;
}

.result-preview-item {
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.result-preview-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.result-preview-item p {
  margin: 10px 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.risk-item {
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.risk-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.risk-item p {
  margin: 10px 0 6px;
  color: var(--text-secondary);
}

.risk-item span {
  color: var(--text-muted);
  font-size: 13px;
}

.faq-item + .faq-item {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(31, 76, 128, 0.16);
}

.knowledge-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.faq-item p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.8;
}

@media (max-width: 1180px) {
  .result-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
