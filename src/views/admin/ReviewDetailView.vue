<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import ComparisonTable from '../../components/ComparisonTable.vue'
import FilePreviewPane from '../../components/FilePreviewPane.vue'
import MachineBadge from '../../components/MachineBadge.vue'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import ScoreSummary from '../../components/ScoreSummary.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDate, formatDateTime, formatPhone } from '../../utils/format'

const route = useRoute()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()
const loading = ref(false)
const notifyLoading = ref(false)

const record = computed(() => reviewsStore.getRecord(route.params.id))
const supplier = computed(() => suppliersStore.currentSupplier(record.value?.supplierId))
const threshold = computed(() => standardsStore.resolveThreshold(supplier.value?.enterprise))
const notificationLogs = computed(() => reviewsStore.notificationsByRecord(route.params.id))
const latestNotification = computed(() => reviewsStore.latestNotificationByRecord(route.params.id))

const reviewForm = reactive({
  status: 'approved',
  opinion: '',
  unmetClausesText: '',
  improvementSuggestionsText: '',
  appealable: false,
  appealDeadline: '',
  quality: 0,
  technical: 0,
  business: 0,
  bonus: 0,
})

watch(
  record,
  (value) => {
    if (!value) return
    reviewForm.status = value.status
    reviewForm.opinion = value.adminOpinion || ''
    reviewForm.unmetClausesText = (value.unmetClauses || []).join('\n')
    reviewForm.improvementSuggestionsText = (value.improvementSuggestions || []).join('\n')
    reviewForm.appealable = Boolean(value.appealable)
    reviewForm.appealDeadline = value.appealDeadline ? value.appealDeadline.slice(0, 10) : ''
    reviewForm.quality = value.scoreBreakdown.quality
    reviewForm.technical = value.scoreBreakdown.technical
    reviewForm.business = value.scoreBreakdown.business
    reviewForm.bonus = value.scoreBreakdown.bonus
  },
  { immediate: true },
)

const totalScore = computed(() => {
  const template = standardsStore.findTemplateById(record.value?.standardTemplateId)
  if (!template) return 0
  return Math.round(
    reviewForm.quality * template.weights.quality +
      reviewForm.technical * template.weights.technical +
      reviewForm.business * template.weights.business +
      reviewForm.bonus,
  )
})

function submitReview() {
  if (!record.value) return
  loading.value = true
  setTimeout(() => {
    try {
      reviewsStore.reviewDocument({
        recordId: record.value.id,
        reviewerName: authStore.displayName,
        status: reviewForm.status,
        opinion: reviewForm.opinion,
        unmetClauses: reviewForm.unmetClausesText,
        improvementSuggestions: reviewForm.improvementSuggestionsText,
        appealable: reviewForm.appealable,
        appealDeadline: reviewForm.appealDeadline ? `${reviewForm.appealDeadline}T23:59:59` : '',
        scoreBreakdown: {
          quality: reviewForm.quality,
          technical: reviewForm.technical,
          business: reviewForm.business,
          bonus: reviewForm.bonus,
          total: totalScore.value,
        },
      })
      ElMessage.success('审核结果已提交，并同步至供应商端。')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      loading.value = false
    }
  }, 700)
}

function sendNotification() {
  if (!record.value) return
  notifyLoading.value = true
  setTimeout(() => {
    try {
      reviewsStore.sendRiskNotification({
        recordId: record.value.id,
        operatorName: authStore.displayName,
        trigger: 'manual',
        mode: 'manual',
      })
      ElMessage.success('已向供应商手机号发送短信提醒。')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      notifyLoading.value = false
    }
  }, 400)
}
</script>

<template>
  <div v-if="record" class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核详情工作台</h1>
        <p>集中查看文件内容、细化风险状态、短信通知历史和审核评分，支持管理员一键提醒供应商处理文件风险。</p>
      </div>
      <div class="toolbar">
        <MachineBadge :status="record.machineStatus" :score="record.precheckScore" />
        <RiskStatusTag :status="record.riskStatus" />
        <StatusTag :status="record.status" />
      </div>
    </div>

    <div class="content-grid review-main-grid">
      <FilePreviewPane :preview-url="record.previewUrl" :mime-type="record.mimeType" :title="record.fileName" />
      <div class="content-grid review-side-grid">
        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>供应商信息</h3>
          </div>
          <div class="metric-row">
            <span>供应商名称</span>
            <strong>{{ supplier?.enterprise.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ supplier?.enterprise.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>联系人手机</span>
            <strong>{{ formatPhone(supplier?.enterprise.contactPhone || '') }}</strong>
          </div>
          <div class="metric-row">
            <span>供应商类型</span>
            <strong>{{ standardsStore.supplierTypes.find((item) => item.value === supplier?.enterprise.supplierType)?.label }}</strong>
          </div>
          <div class="metric-row">
            <span>任务号</span>
            <strong>{{ record.taskNo }}</strong>
          </div>
          <div class="metric-row">
            <span>上传来源</span>
            <strong>{{ record.uploadSource === 'admin' ? '管理员代上传' : '供应商上传' }}</strong>
          </div>
          <div class="metric-row">
            <span>申诉资格</span>
            <strong>{{ record.appealable ? `可申诉，截止 ${formatDate(record.appealDeadline)}` : '当前不可申诉' }}</strong>
          </div>
        </div>

        <ScoreSummary
          :score="{
            quality: reviewForm.quality,
            technical: reviewForm.technical,
            business: reviewForm.business,
            bonus: reviewForm.bonus,
            total: totalScore,
          }"
          :threshold="threshold"
        />

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>风险与通知</h3>
            <el-button
              v-if="record.riskStatus.code !== 'normal'"
              type="danger"
              plain
              :loading="notifyLoading"
              @click="sendNotification"
            >
              一键发送短信
            </el-button>
          </div>
          <div v-if="record.riskAlerts.length" class="capsule-list">
            <span v-for="item in record.riskAlerts" :key="item.code" class="capsule-item">{{ item.label }}</span>
          </div>
          <div v-else class="rich-empty">当前文件暂无风险告警。</div>
          <div class="soft-divider" />
          <div class="metric-row">
            <span>风险等级</span>
            <RiskStatusTag :status="record.riskStatus" />
          </div>
          <div class="metric-row">
            <span>通知状态</span>
            <el-tag :type="record.notificationState.type">{{ record.notificationState.label }}</el-tag>
          </div>
          <div class="metric-row">
            <span>最近通知时间</span>
            <strong>{{ formatDateTime(latestNotification?.sentAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>最近通知人</span>
            <strong>{{ latestNotification?.operatorName || '--' }}</strong>
          </div>
          <div v-if="notificationLogs.length" class="notify-log-list">
            <div v-for="item in notificationLogs.slice(0, 3)" :key="item.id" class="notify-log-item">
              <strong>{{ item.mode === 'manual' ? '人工短信' : '自动短信' }}</strong>
              <span>{{ formatDateTime(item.sentAt) }}</span>
              <p>{{ item.message }}</p>
            </div>
          </div>
        </div>

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>同源主体线索</h3>
          </div>
          <div v-if="record.sameSourceMatches.length">
            <div v-for="item in record.sameSourceMatches" :key="`${item.person}-${item.matchedCompany}`" class="metric-row">
              <span>{{ item.person }} / {{ item.relation }}</span>
              <strong>{{ item.matchedCompany }}</strong>
            </div>
          </div>
          <div v-else class="rich-empty">未命中同源主体。</div>
        </div>
      </div>
    </div>

    <ComparisonTable :rows="record.comparisons" />

    <div class="section-card detail-card">
      <div class="panel-title">
        <h3>审核操作</h3>
      </div>
      <div class="form-grid">
        <div>
          <el-form label-position="top">
            <el-form-item label="审核结论">
              <el-radio-group v-model="reviewForm.status" :disabled="record.status === 'approved'">
                <el-radio label="approved">通过</el-radio>
                <el-radio label="conditional">有条件通过</el-radio>
                <el-radio label="rejected">未通过</el-radio>
                <el-radio label="pending">保持审核中</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.opinion"
                type="textarea"
                :rows="4"
                placeholder="未通过时必须填写原因，也可补充整改建议。"
                :disabled="record.status === 'approved'"
              />
            </el-form-item>
            <el-form-item
              v-if="reviewForm.status === 'conditional' || reviewForm.status === 'rejected'"
              label="未满足条款"
            >
              <el-input
                v-model="reviewForm.unmetClausesText"
                type="textarea"
                :rows="4"
                placeholder="每行填写一条，例如：认证范围未覆盖本次准入采购范围"
                :disabled="record.status === 'approved'"
              />
            </el-form-item>
            <el-form-item
              v-if="reviewForm.status === 'conditional' || reviewForm.status === 'rejected'"
              label="改进建议"
            >
              <el-input
                v-model="reviewForm.improvementSuggestionsText"
                type="textarea"
                :rows="4"
                placeholder="每行填写一条改进建议，后续会展示给供应商"
                :disabled="record.status === 'approved'"
              />
            </el-form-item>
            <div v-if="reviewForm.status === 'conditional' || reviewForm.status === 'rejected'" class="appeal-box">
              <el-checkbox v-model="reviewForm.appealable" :disabled="record.status === 'approved'">
                允许供应商申诉
              </el-checkbox>
              <el-date-picker
                v-if="reviewForm.appealable"
                v-model="reviewForm.appealDeadline"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择申诉截止日期"
                style="width: 100%; margin-top: 12px"
                :disabled="record.status === 'approved'"
              />
            </div>
          </el-form>
        </div>
        <div class="score-form">
          <div class="metric-row">
            <span>质量部分</span>
            <el-input-number v-model="reviewForm.quality" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>技术部分</span>
            <el-input-number v-model="reviewForm.technical" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>商务部分</span>
            <el-input-number v-model="reviewForm.business" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>加分项</span>
            <el-input-number v-model="reviewForm.bonus" :min="0" :max="5" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>准入门槛</span>
            <strong>{{ threshold }} 分</strong>
          </div>
          <div class="metric-row">
            <span>当前总分</span>
            <strong>{{ totalScore }} 分</strong>
          </div>
        </div>
      </div>
      <div class="toolbar" style="margin-top: 18px">
        <el-button type="primary" :loading="loading" :disabled="record.status === 'approved'" @click="submitReview">
          提交审核
        </el-button>
        <span class="status-text">已通过文件会锁定结果；有条件通过或未通过的文件可补充未满足条款、改进建议和申诉资格。</span>
      </div>
    </div>
  </div>
  <div v-else class="rich-empty">未找到该审核记录。</div>
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

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
}

.review-main-grid {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  align-items: start;
}

.review-side-grid {
  align-content: start;
}

.score-form {
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.82);
  padding: 14px 16px;
}

.appeal-box {
  margin-top: 6px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.9);
  border: 1px solid var(--line-soft);
}

.notify-log-list {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.notify-log-item {
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.8);
}

.notify-log-item span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.notify-log-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1440px) {
  .review-main-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
