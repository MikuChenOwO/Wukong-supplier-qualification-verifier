<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import FilePreviewPane from '../../components/FilePreviewPane.vue'
import ComparisonTable from '../../components/ComparisonTable.vue'
import ScoreSummary from '../../components/ScoreSummary.vue'
import MachineBadge from '../../components/MachineBadge.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDate, formatDateTime } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const record = computed(() => reviewsStore.getRecord(route.params.id))
const supplier = computed(() => suppliersStore.currentSupplier(record.value?.supplierId))
const threshold = computed(() => standardsStore.resolveThreshold(supplier.value?.enterprise))
const latestAppeal = computed(() => reviewsStore.latestAppealByRecord(route.params.id))
const latestRereview = computed(() => reviewsStore.latestRereviewByRecord(route.params.id))

function appealStatusLabel(status) {
  return {
    submitted: '已提交',
    under_review: '复核中',
    supplement_required: '待补充材料',
    accepted: '申诉成立',
    rejected: '申诉驳回',
    closed: '已结案',
  }[status] || '暂无'
}

function rereviewStatusLabel(status) {
  return {
    pending: '待处理',
    in_progress: '复审中',
    approved: '重审通过',
    rejected: '重审未通过',
    closed: '任务关闭',
  }[status] || '暂无'
}

function rereviewSourceLabel(source) {
  return {
    'risk-radar': '动态风控触发',
    'file-update': '资料更新触发',
    manual: '人工发起',
  }[source] || source || '--'
}
</script>

<template>
  <div v-if="record" class="content-grid">
    <div class="page-title">
      <div>
        <h1>核验详情</h1>
        <p>查看文件预览、识别字段、标准比对、风险标记、申诉状态和重审进度。</p>
      </div>
      <div class="toolbar">
        <MachineBadge :status="record.machineStatus" :score="record.precheckScore" />
        <StatusTag :status="record.status" />
        <el-button
          v-if="record.appealable"
          type="warning"
          plain
          @click="router.push(`/supplier/appeals?recordId=${record.id}`)"
        >
          发起申诉
        </el-button>
        <el-button
          v-if="record.status === 'rejected'"
          type="primary"
          @click="router.push(`/supplier/upload?reupload=${record.id}&category=${record.category}`)"
        >
          重新上传
        </el-button>
      </div>
    </div>

    <div class="content-grid two-col">
      <FilePreviewPane :preview-url="record.previewUrl" :mime-type="record.mimeType" :title="record.fileName" />
      <div class="content-grid">
        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>任务概况</h3>
          </div>
          <div class="metric-row">
            <span>审核任务号</span>
            <strong>{{ record.taskNo }}</strong>
          </div>
          <div class="metric-row">
            <span>上传时间</span>
            <strong>{{ formatDateTime(record.uploadedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(record.reviewedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>审核人</span>
            <strong>{{ record.reviewerName || '待分配' }}</strong>
          </div>
          <div class="metric-row">
            <span>管理员意见</span>
            <strong>{{ record.adminOpinion || '待审核' }}</strong>
          </div>
          <div class="metric-row">
            <span>申诉资格</span>
            <strong>{{ record.appealable ? `可申诉，截止 ${formatDate(record.appealDeadline)}` : '当前不可申诉' }}</strong>
          </div>
          <div class="metric-row">
            <span>申诉状态</span>
            <strong>{{ latestAppeal ? `${appealStatusLabel(latestAppeal.status)}·${formatDateTime(latestAppeal.updatedAt || latestAppeal.submittedAt)}` : '尚未提交申诉' }}</strong>
          </div>
          <div class="metric-row">
            <span>重审状态</span>
            <strong>{{ latestRereview ? `${rereviewStatusLabel(latestRereview.status)}·${formatDateTime(latestRereview.updatedAt || latestRereview.createdAt)}` : '当前无复审任务' }}</strong>
          </div>
        </div>

        <ScoreSummary :score="record.scoreBreakdown" :threshold="threshold" />

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>机器识别字段</h3>
          </div>
          <div class="metric-row">
            <span>企业名称</span>
            <strong>{{ record.extractedFields.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ record.extractedFields.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>法人</span>
            <strong>{{ record.extractedFields.legalPerson }}</strong>
          </div>
          <div class="metric-row">
            <span>证书有效期</span>
            <strong>{{ record.extractedFields.validUntil }}</strong>
          </div>
          <div class="metric-row">
            <span>认证范围</span>
            <strong>{{ record.extractedFields.certificationScope }}</strong>
          </div>
        </div>
      </div>
    </div>

    <ComparisonTable :rows="record.comparisons" />

    <div class="content-grid two-col">
      <div
        v-if="record.status === 'conditional' || record.status === 'rejected'"
        class="section-card detail-card"
      >
        <div class="panel-title">
          <h3>审核结论说明</h3>
        </div>
        <div v-if="record.unmetClauses?.length">
          <div class="section-subtitle">未满足条款</div>
          <div class="capsule-list">
            <span v-for="item in record.unmetClauses" :key="item" class="capsule-item">{{ item }}</span>
          </div>
        </div>
        <div v-if="record.improvementSuggestions?.length" style="margin-top: 14px">
          <div class="section-subtitle">整改建议</div>
          <div class="suggestion-list">
            <div v-for="item in record.improvementSuggestions" :key="item" class="suggestion-item">{{ item }}</div>
          </div>
        </div>
      </div>

      <div class="section-card detail-card">
        <div class="panel-title">
          <h3>风险标记</h3>
        </div>
        <div v-if="record.riskFlags.length" class="capsule-list">
          <span v-for="item in record.riskFlags" :key="item" class="capsule-item">{{ item }}</span>
        </div>
        <div v-else class="rich-empty">当前无风险标记。</div>
      </div>

      <div v-if="latestRereview" class="section-card detail-card">
        <div class="panel-title">
          <h3>重审跟进说明</h3>
        </div>
        <div class="metric-row">
          <span>任务编号</span>
          <strong>{{ latestRereview.taskNo }}</strong>
        </div>
        <div class="metric-row">
          <span>触发来源</span>
          <strong>{{ rereviewSourceLabel(latestRereview.triggerSource) }}</strong>
        </div>
        <div class="metric-row">
          <span>当前阶段</span>
          <strong>{{ rereviewStatusLabel(latestRereview.status) }}</strong>
        </div>
        <div class="suggestion-item" style="margin-top: 12px">{{ latestRereview.reason }}</div>
      </div>

      <div class="section-card detail-card">
        <div class="panel-title">
          <h3>同源筛查结果</h3>
        </div>
        <div v-if="record.sameSourceMatches.length">
          <div v-for="item in record.sameSourceMatches" :key="`${item.person}-${item.matchedCompany}`" class="metric-row">
            <span>{{ item.person }} / {{ item.relation }}</span>
            <strong>{{ item.matchedCompany }}（{{ item.riskLevel }}风险）</strong>
          </div>
        </div>
        <div v-else class="rich-empty">未命中同源主体。</div>
      </div>
    </div>
  </div>
  <div v-else class="rich-empty">未找到对应记录。</div>
</template>

<style scoped>
.detail-card {
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
</style>
