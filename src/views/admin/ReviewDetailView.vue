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
import StatCard from '../../components/StatCard.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDate, formatDateTime, formatPhone } from '../../utils/format'

const route = useRoute()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const loading = ref(false)
const notifyLoading = ref(false)
const comparisonFocus = ref('all')

const record = computed(() => reviewsStore.getRecord(route.params.id))
const supplier = computed(() => suppliersStore.currentSupplier(record.value?.supplierId))
const threshold = computed(() => standardsStore.resolveThreshold(supplier.value?.enterprise))
const notificationLogs = computed(() => reviewsStore.notificationsByRecord(route.params.id))
const latestNotification = computed(() => reviewsStore.latestNotificationByRecord(route.params.id))

const externalDecisionOptions = [
  { label: '人工确认通过', value: 'confirmed' },
  { label: '保留风险结论', value: 'risk-retained' },
  { label: '要求补件后重审', value: 'resubmit' },
]

const reviewForm = reactive({
  status: 'approved',
  opinion: '',
  unmetClausesText: '',
  improvementSuggestionsText: '',
  appealable: false,
  appealDeadline: '',
  externalChecks: [],
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
    reviewForm.externalChecks = (value.externalChecks || []).map((item) => ({
      ...item,
      affectedFields: [...(item.affectedFields || [])],
      affectedMaterials: [...(item.affectedMaterials || [])],
    }))
    reviewForm.quality = value.scoreBreakdown?.quality || 0
    reviewForm.technical = value.scoreBreakdown?.technical || 0
    reviewForm.business = value.scoreBreakdown?.business || 0
    reviewForm.bonus = value.scoreBreakdown?.bonus || 0
  },
  { immediate: true },
)

function comparisonLevel(result) {
  if (result === '不匹配') return 'mismatch'
  if (result === '待确认') return 'pending'
  return 'match'
}

function externalStatusType(status) {
  return {
    exception: 'danger',
    'manual-reviewed': 'success',
    'auto-passed': 'success',
  }[status] || 'warning'
}

function externalStatusLabel(status) {
  return {
    exception: '接口异常待确认',
    'manual-reviewed': '已人工复核',
    'auto-passed': '自动核验完成',
  }[status] || '待处理'
}

function externalDecisionType(decision) {
  return {
    confirmed: 'success',
    'risk-retained': 'warning',
    resubmit: 'danger',
  }[decision] || 'info'
}

function externalDecisionLabel(decision) {
  return {
    confirmed: '人工确认通过',
    'risk-retained': '保留风险结论',
    resubmit: '要求补件后重审',
  }[decision] || '待处理'
}

function riskSuggestion(alert) {
  return {
    expired: '补传最新有效证书，并说明续期完成时间。',
    'urgent-expiring': '尽快提交续期证明或新版证书，避免业务冻结。',
    expiring: '提前准备续期资料，并补充预计完成时间。',
    reupload: '根据退回意见重新上传完整材料。',
    'field-mismatch': '核对主体信息后重新上传一致材料。',
    'scope-pending': '补充认证范围覆盖说明或补充凭证。',
    veto: '补充关键能力证明，否则不建议审核通过。',
    'same-source': '补充关联主体说明和风险隔离证明。',
    'manual-review': '补充人工复核意见，明确是否继续保留风险。',
    'precheck-fail': '优先核查机器预警项，并补全缺失说明。',
    'external-exception': '请结合供应商原始材料和审核标准完成人工核验。',
  }[alert.code] || '请结合当前疑点补充人工复核说明。'
}

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

const comparisonStats = computed(() => {
  const rows = record.value?.comparisons || []
  return {
    match: rows.filter((item) => comparisonLevel(item.result) === 'match').length,
    mismatch: rows.filter((item) => comparisonLevel(item.result) === 'mismatch').length,
    pending: rows.filter((item) => comparisonLevel(item.result) === 'pending').length,
  }
})

const vetoHit = computed(() => (record.value?.riskFlags || []).some((item) => String(item).includes('一票否决')))
const sameSourceCount = computed(() => record.value?.sameSourceMatches?.length || 0)
const alertCount = computed(() => record.value?.riskAlerts?.length || 0)
const externalCheckRows = computed(() => reviewForm.externalChecks || [])
const externalExceptionCount = computed(() => record.value?.externalCheckSummary?.total || 0)
const unresolvedExternalCount = computed(() => record.value?.externalCheckSummary?.pending || 0)
const completedExternalCount = computed(() => record.value?.externalCheckSummary?.completed || 0)

const issueCards = computed(() => {
  if (!record.value) return []

  const cards = []

  ;(record.value.externalChecks || []).forEach((item) => {
    if (!item.pendingManual) return
    cards.push({
      key: `external-${item.id}`,
      title: `外部调用异常：${item.checkItem}`,
      level: 'warning',
      description: `${item.serviceName} 未正常返回结果，影响材料：${(item.affectedMaterials || []).join('、') || item.materialName}。`,
      clause: `${item.checkItem}需人工确认`,
      suggestion: item.fallbackSuggestion || '请结合原始材料和审核标准补充人工复核意见。',
    })
  })

  ;(record.value.riskAlerts || []).forEach((alert) => {
    cards.push({
      key: `risk-${alert.code}`,
      title: alert.label,
      level:
        alert.severity === 'critical'
          ? 'danger'
          : alert.severity === 'high'
            ? 'danger'
            : alert.severity === 'medium'
              ? 'warning'
              : 'info',
      description: alert.description,
      clause: alert.label,
      suggestion: riskSuggestion(alert),
    })
  })

  ;(record.value.comparisons || []).forEach((item) => {
    if (comparisonLevel(item.result) === 'mismatch') {
      cards.push({
        key: `cmp-mismatch-${item.field}`,
        title: `字段不一致：${item.field}`,
        level: 'danger',
        description: `标准值为“${item.expected}”，识别结果为“${item.actual}”。`,
        clause: `${item.field}与标准信息不一致`,
        suggestion: `请补充${item.field}对应的有效证明材料，并确认与主数据一致。`,
      })
    }

    if (comparisonLevel(item.result) === 'pending') {
      cards.push({
        key: `cmp-pending-${item.field}`,
        title: `待人工确认：${item.field}`,
        level: 'warning',
        description: `当前字段识别结果为“${item.actual}”，仍需人工进一步确认。`,
        clause: `${item.field}仍待人工确认`,
        suggestion: `请补充${item.field}的说明材料，或在审核意见中明确确认依据。`,
      })
    }
  })

  ;(record.value.sameSourceMatches || []).forEach((item, index) => {
    cards.push({
      key: `same-source-${index}`,
      title: `同源主体命中：${item.person}`,
      level: 'warning',
      description: `${item.person} 与 ${item.matchedCompany} 存在 ${item.relation} 关联，当前判定为${item.riskLevel}风险。`,
      clause: '存在同源主体关联风险',
      suggestion: '请补充关联主体说明、隔离措施或历史合作证明。',
    })
  })

  return cards
})

const checklist = computed(() => {
  if (!record.value) return []

  const entityMismatch = (record.value.comparisons || []).some(
    (item) => ['企业名称', '统一社会信用代码', '法人'].includes(item.field) && comparisonLevel(item.result) === 'mismatch',
  )
  const scopePending = (record.value.comparisons || []).some(
    (item) => ['认证范围', '专利名称', '授权链路', '说明覆盖范围', '补传内容'].includes(item.field) && comparisonLevel(item.result) !== 'match',
  )
  const renewalLevel = record.value.renewalState?.level
  const externalPending = unresolvedExternalCount.value > 0

  return [
    {
      label: '有效期与基础风险',
      status:
        renewalLevel === 'expired'
          ? 'danger'
          : renewalLevel === 'expiring' || renewalLevel === 'urgent-expiring'
            ? 'warning'
            : 'success',
      note: record.value.renewalState?.reason || '当前未识别到证书有效期风险。',
    },
    {
      label: '主体信息一致性',
      status: entityMismatch ? 'danger' : 'success',
      note: entityMismatch ? '企业名称、统一社会信用代码或法人信息存在不一致项。' : '主体核心字段已与标准信息对齐。',
    },
    {
      label: '认证范围与关键字段',
      status: scopePending ? 'warning' : 'success',
      note: scopePending ? '认证范围或关键字段仍待进一步确认。' : '认证范围与关键字段未发现明显疑点。',
    },
    {
      label: '外部接口异常项',
      status: externalPending ? 'warning' : 'success',
      note: externalExceptionCount.value
        ? externalPending
          ? `共有 ${unresolvedExternalCount.value} 项外部核验异常待人工确认。`
          : `外部异常项已处理完成，共 ${completedExternalCount.value} 项。`
        : '当前未发现外部接口调用异常项。',
    },
    {
      label: '同源主体筛查',
      status: sameSourceCount.value ? 'warning' : 'success',
      note: sameSourceCount.value ? `命中 ${sameSourceCount.value} 条同源主体线索，建议补充说明。` : '当前未命中同源主体线索。',
    },
    {
      label: '评分与一票否决',
      status: vetoHit.value ? 'danger' : totalScore.value >= threshold.value ? 'success' : 'warning',
      note: vetoHit.value
        ? '当前已命中一票否决项，不能直接审核通过。'
        : totalScore.value >= threshold.value
          ? `当前总分 ${totalScore.value} 分，达到门槛 ${threshold.value} 分。`
          : `当前总分 ${totalScore.value} 分，距离门槛还差 ${threshold.value - totalScore.value} 分。`,
    },
  ]
})

function applyIssueSuggestions() {
  const clauses = [...new Set(issueCards.value.map((item) => item.clause).filter(Boolean))]
  const suggestions = [...new Set(issueCards.value.map((item) => item.suggestion).filter(Boolean))]

  reviewForm.unmetClausesText = clauses.join('\n')
  reviewForm.improvementSuggestionsText = suggestions.join('\n')

  if (!reviewForm.opinion && issueCards.value.length) {
    reviewForm.opinion = `本次审核共识别 ${issueCards.value.length} 个重点疑点，建议供应商根据未满足条款逐项补充说明。`
  }

  if (reviewForm.status === 'approved' && issueCards.value.length) {
    reviewForm.status = vetoHit.value ? 'rejected' : 'conditional'
  }

  if (reviewForm.status === 'conditional' || reviewForm.status === 'rejected') {
    reviewForm.appealable = true
  }

  ElMessage.success('已将当前疑点带入审核表单。')
}

function fillOpinionSummary() {
  if (!record.value) return
  const issueSummary = issueCards.value.slice(0, 3).map((item) => item.title).join('；')
  reviewForm.opinion = issueSummary
    ? `审核重点关注：${issueSummary}。请供应商结合整改建议补充更新材料。`
    : '当前材料整体满足准入要求，建议继续保持资料一致性和有效期管理。'
  ElMessage.success('已生成审核意见摘要。')
}

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
        externalChecks: reviewForm.externalChecks,
      })
      ElMessage.success('审核结果已提交，并同步到供应商端。')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      loading.value = false
    }
  }, 400)
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
  }, 300)
}
</script>

<template>
  <div v-if="record" class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核详情工作台</h1>
        <p>把智能预审、外部异常、材料预览、标准比对和人工复核动作集中在同一页完成。</p>
      </div>
      <div class="toolbar">
        <MachineBadge :status="record.machineStatus" :score="record.precheckScore" />
        <RiskStatusTag :status="record.riskStatus" />
        <StatusTag :status="record.status" />
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="风险告警" :value="alertCount" hint="当前文件识别出的风险提示数量" tone="danger" />
      <StatCard label="不一致项" :value="comparisonStats.mismatch" hint="字段与标准值不一致的数量" tone="danger" />
      <StatCard label="待确认项" :value="comparisonStats.pending" hint="需要人工进一步判断的字段数量" />
      <StatCard label="外部异常项" :value="externalExceptionCount" hint="外部接口未正常返回的核验事项数量" tone="warning" />
      <StatCard label="同源命中" :value="sameSourceCount" hint="关联主体线索命中数量" />
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
            <span>联系人手机号</span>
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
          :veto-hit="vetoHit"
        />

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>审核摘要</h3>
          </div>
          <div class="summary-grid">
            <div class="summary-item">
              <span>机器预审分</span>
              <strong>{{ record.precheckScore }} 分</strong>
            </div>
            <div class="summary-item">
              <span>当前总分</span>
              <strong>{{ totalScore }} 分</strong>
            </div>
            <div class="summary-item">
              <span>审核门槛</span>
              <strong>{{ threshold }} 分</strong>
            </div>
            <div class="summary-item">
              <span>一票否决</span>
              <strong :class="vetoHit ? 'danger-note' : 'success-note'">{{ vetoHit ? '已命中' : '未命中' }}</strong>
            </div>
          </div>
          <el-alert
            v-if="vetoHit"
            type="error"
            :closable="false"
            title="当前命中一票否决项，请勿直接审核通过。"
            class="summary-alert"
          />
          <el-alert
            v-else-if="totalScore < threshold"
            type="warning"
            :closable="false"
            :title="`当前分数低于门槛 ${threshold - totalScore} 分，建议补充整改要求。`"
            class="summary-alert"
          />
          <el-alert
            v-else
            type="success"
            :closable="false"
            title="当前分数达到门槛，可结合疑点清单继续人工确认。"
            class="summary-alert"
          />
        </div>

        <div class="section-card detail-card">
          <div class="panel-title">
            <div>
              <h3>智能预审核异常项</h3>
              <p>展示工商比对、证书验真、OCR 识别等外部调用未正常完成的事项。</p>
            </div>
            <el-tag :type="unresolvedExternalCount ? 'danger' : 'success'">
              {{ unresolvedExternalCount ? `待人工确认 ${unresolvedExternalCount}` : `已处理 ${completedExternalCount}` }}
            </el-tag>
          </div>

          <div v-if="externalCheckRows.length" class="issue-list">
            <div v-for="item in externalCheckRows" :key="item.id" class="issue-item" :class="item.pendingManual ? 'warning' : 'success'">
              <div class="issue-head">
                <strong>{{ item.checkItem }}</strong>
                <el-tag :type="externalStatusType(item.status)">{{ externalStatusLabel(item.status) }}</el-tag>
              </div>
              <p>{{ item.message }}</p>
              <div class="detail-stack">
                <span class="status-text">异常来源：{{ item.serviceName }}</span>
                <span class="status-text">影响材料：{{ (item.affectedMaterials || []).join('、') || item.materialName }}</span>
                <span class="status-text">受影响字段：{{ (item.affectedFields || []).join('、') || '未标记' }}</span>
                <span class="status-text">人工建议：{{ item.fallbackSuggestion }}</span>
              </div>
              <div v-if="item.manualDecision" class="manual-result-line">
                <el-tag :type="externalDecisionType(item.manualDecision)">{{ externalDecisionLabel(item.manualDecision) }}</el-tag>
                <span class="status-text">{{ item.handledBy || '审核员' }} · {{ formatDateTime(item.handledAt) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="rich-empty">当前未发现外部接口调用异常项。</div>
        </div>

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>疑点高亮</h3>
            <div class="toolbar">
              <el-button plain @click="fillOpinionSummary">生成审核摘要</el-button>
              <el-button type="primary" plain @click="applyIssueSuggestions">带入疑点条款</el-button>
            </div>
          </div>
          <div v-if="issueCards.length" class="issue-list">
            <div v-for="item in issueCards.slice(0, 8)" :key="item.key" class="issue-item" :class="item.level">
              <div class="issue-head">
                <strong>{{ item.title }}</strong>
                <el-tag :type="item.level === 'danger' ? 'danger' : item.level === 'warning' ? 'warning' : 'info'">
                  {{ item.level === 'danger' ? '高优先级' : item.level === 'warning' ? '待确认' : '关注' }}
                </el-tag>
              </div>
              <p>{{ item.description }}</p>
              <span class="status-text">建议：{{ item.suggestion }}</span>
            </div>
          </div>
          <div v-else class="rich-empty">当前没有需要特别高亮的审核疑点。</div>
        </div>

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
      </div>
    </div>

    <div class="section-card detail-card">
      <div class="panel-title">
        <div>
          <h3>标准逐项比对</h3>
          <p>支持按全部、待确认、不匹配快速切换，优先聚焦需要人工判断的字段。</p>
        </div>
        <div class="toolbar">
          <el-button :type="comparisonFocus === 'all' ? 'primary' : 'default'" @click="comparisonFocus = 'all'">全部</el-button>
          <el-button :type="comparisonFocus === 'mismatch' ? 'primary' : 'default'" @click="comparisonFocus = 'mismatch'">仅看不匹配</el-button>
          <el-button :type="comparisonFocus === 'pending' ? 'primary' : 'default'" @click="comparisonFocus = 'pending'">仅看待确认</el-button>
          <el-button :type="comparisonFocus === 'match' ? 'primary' : 'default'" @click="comparisonFocus = 'match'">仅看匹配</el-button>
        </div>
      </div>
      <ComparisonTable :rows="record.comparisons" :focus-mode="comparisonFocus" />
    </div>

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

            <div v-if="externalCheckRows.length" class="manual-brief-panel">
              <div class="manual-brief-head">
                <h3>异常项人工复核简报</h3>
                <span class="status-text">请对每个外部调用异常项给出人工判断和处理意见。</span>
              </div>
              <div class="manual-brief-list">
                <div v-for="item in reviewForm.externalChecks" :key="item.id" class="manual-brief-item">
                  <div class="issue-head">
                    <strong>{{ item.checkItem }}</strong>
                    <el-tag :type="externalStatusType(item.status)">{{ externalStatusLabel(item.status) }}</el-tag>
                  </div>
                  <p>{{ item.message }}</p>
                  <div class="detail-stack">
                    <span class="status-text">异常来源：{{ item.serviceName }}</span>
                    <span class="status-text">受影响字段：{{ (item.affectedFields || []).join('、') || '未标记' }}</span>
                  </div>
                  <el-select
                    v-model="item.manualDecision"
                    placeholder="请选择人工复核结论"
                    style="width: 100%; margin-top: 12px"
                    :disabled="record.status === 'approved'"
                  >
                    <el-option
                      v-for="option in externalDecisionOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  <el-input
                    v-model="item.manualNote"
                    type="textarea"
                    :rows="3"
                    style="margin-top: 12px"
                    placeholder="填写人工复核过程、判断依据和处理结果"
                    :disabled="record.status === 'approved'"
                  />
                </div>
              </div>
            </div>

            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.opinion"
                type="textarea"
                :rows="4"
                placeholder="可先用“生成审核摘要”，再补充人工判断。"
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
                placeholder="每行填写一条未满足条款"
                :disabled="record.status === 'approved'"
              />
            </el-form-item>

            <el-form-item
              v-if="reviewForm.status === 'conditional' || reviewForm.status === 'rejected'"
              label="整改建议"
            >
              <el-input
                v-model="reviewForm.improvementSuggestionsText"
                type="textarea"
                :rows="4"
                placeholder="每行填写一条整改建议"
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

        <div class="content-grid">
          <div class="section-card checklist-card">
            <div class="panel-title">
              <h3>人工复核清单</h3>
            </div>
            <div class="checklist-list">
              <div v-for="item in checklist" :key="item.label" class="check-item" :class="item.status">
                <div class="check-head">
                  <strong>{{ item.label }}</strong>
                  <el-tag :type="item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'">
                    {{ item.status === 'danger' ? '高风险' : item.status === 'warning' ? '待确认' : '已覆盖' }}
                  </el-tag>
                </div>
                <p>{{ item.note }}</p>
              </div>
            </div>
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
            <div class="metric-row">
              <span>一票否决</span>
              <strong :class="vetoHit ? 'danger-note' : 'success-note'">{{ vetoHit ? '已命中' : '未命中' }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar submit-bar">
        <el-button type="primary" :loading="loading" :disabled="record.status === 'approved'" @click="submitReview">
          提交审核
        </el-button>
        <span class="status-text">已通过文件会锁定结论；若存在外部异常项，请先完成每项人工复核结论再提交。</span>
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
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.review-main-grid {
  grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
  align-items: start;
}

.review-side-grid {
  align-content: start;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(248, 251, 255, 0.9);
}

.summary-item span {
  color: var(--text-muted);
  font-size: 13px;
}

.summary-item strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.summary-alert {
  margin-top: 14px;
}

.issue-list,
.checklist-list,
.notify-log-list,
.manual-brief-list {
  display: grid;
  gap: 12px;
}

.issue-item,
.check-item,
.notify-log-item,
.manual-brief-item {
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.84);
}

.issue-item.danger,
.check-item.danger {
  border-color: rgba(197, 63, 79, 0.28);
  background: rgba(197, 63, 79, 0.06);
}

.issue-item.warning,
.check-item.warning,
.manual-brief-item {
  border-color: rgba(194, 134, 16, 0.24);
  background: rgba(194, 134, 16, 0.06);
}

.issue-item.success {
  border-color: rgba(31, 143, 93, 0.26);
  background: rgba(31, 143, 93, 0.06);
}

.issue-head,
.check-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.issue-item p,
.check-item p,
.notify-log-item p,
.manual-brief-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.detail-stack {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.manual-result-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
}

.score-form,
.checklist-card,
.manual-brief-panel {
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.84);
  padding: 14px 16px;
}

.manual-brief-panel {
  margin-bottom: 18px;
}

.manual-brief-head h3 {
  margin: 0 0 6px;
}

.appeal-box {
  margin-top: 6px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.9);
  border: 1px solid var(--line-soft);
}

.notify-log-item span,
.status-text {
  color: var(--text-muted);
  font-size: 13px;
}

.submit-bar {
  margin-top: 18px;
}

@media (max-width: 1180px) {
  .review-main-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .manual-result-line {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
