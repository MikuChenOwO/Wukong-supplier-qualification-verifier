<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { formatDateTime, formatDate } from '../../utils/format'

const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const suppliersStore = useSuppliersStore()
const standardsStore = useStandardsStore()

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const records = computed(() => reviewsStore.recordsBySupplier(authStore.userId))
const riskRecords = computed(() => reviewsStore.riskRecordsBySupplier(authStore.userId))
const approvedCount = computed(() => records.value.filter((item) => item.status === 'approved').length)
const pendingCount = computed(() => records.value.filter((item) => item.status === 'pending').length)
const criticalCount = computed(() => riskRecords.value.filter((item) => item.riskStatus.code === 'critical').length)
const notifiedCount = computed(() => riskRecords.value.filter((item) => item.notificationState.count > 0).length)
const latestApproved = computed(() => reviewsStore.latestApprovedRecordBySupplier(authStore.userId))
const nextReviewAt = computed(() => latestApproved.value?.nextReviewAt || '')
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
const latestRiskRecords = computed(() => riskRecords.value.slice(0, 4))
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商总览</h1>
        <p>这里集中展示企业档案、当前审核模板和更细化的文件告警状态，帮助供应商快速定位需要优先处理的风险文件。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="累计资质文件" :value="records.length" hint="当前企业全部上传记录" />
      <StatCard label="审核通过" :value="approvedCount" hint="通过后自动锁定并保留历史" tone="success" />
      <StatCard label="审核中" :value="pendingCount" hint="等待管理员处理的文件数量" />
      <StatCard label="紧急告警" :value="criticalCount" hint="已过期或触发关键风险的文件" tone="danger" />
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
          <el-tag :type="notifiedCount ? 'warning' : 'success'">{{ notifiedCount ? '已提醒' : '未触发短信' }}</el-tag>
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
        <div v-for="item in standardsStore.knowledgeBase.slice(0, 3)" :key="item.id" class="faq-item">
          <strong>{{ item.title }}</strong>
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

.faq-item p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.8;
}
</style>
