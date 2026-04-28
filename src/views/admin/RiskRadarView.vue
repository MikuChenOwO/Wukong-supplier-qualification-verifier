<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import StatCard from '../../components/StatCard.vue'
import { formatDate, formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const selectedSupplierId = ref('')
const ruleDrawerVisible = ref(false)
const activeRuleCode = ref('')
const activeRadarView = ref('overview')

const timeRangeConfigs = {
  '7d': { label: '近 7 天', days: 7, bucketCount: 7, stepDays: 1 },
  '30d': { label: '近 30 天', days: 30, bucketCount: 6, stepDays: 5 },
  '90d': { label: '近 90 天', days: 90, bucketCount: 6, stepDays: 15 },
  '180d': { label: '近 180 天', days: 180, bucketCount: 6, stepDays: 30 },
}

const ownerTeamOptions = ['风险运营', '资质审核', '采购合规', '供应商管理']

const rulePresetList = [
  {
    code: 'expired',
    label: '证书已过期',
    severity: 'critical',
    description: '资质文件已过有效期，需要立即冻结或补传。',
    ownerTeam: '资质审核',
    slaHours: 4,
    enabled: true,
    autoFreeze: true,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'urgent-expiring',
    label: '证书临期加急',
    severity: 'high',
    description: '文件距离失效时间极近，需优先催补。',
    ownerTeam: '资质审核',
    slaHours: 8,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'expiring',
    label: '证书临期',
    severity: 'medium',
    description: '文件即将到期，需要纳入跟踪续期计划。',
    ownerTeam: '供应商管理',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: false,
  },
  {
    code: 'reupload',
    label: '退回补传',
    severity: 'high',
    description: '管理员已退回文件，需等待供应商重新上传。',
    ownerTeam: '资质审核',
    slaHours: 12,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: false,
  },
  {
    code: 'field-mismatch',
    label: '主体信息不一致',
    severity: 'high',
    description: '企业名称、信用代码或法人信息与主数据不一致。',
    ownerTeam: '采购合规',
    slaHours: 8,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'scope-pending',
    label: '认证范围待核实',
    severity: 'medium',
    description: '认证范围与准入要求存在差异，需要人工确认。',
    ownerTeam: '资质审核',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'veto',
    label: '触发一票否决',
    severity: 'critical',
    description: '命中关键否决项，需要立即中止准入流程。',
    ownerTeam: '采购合规',
    slaHours: 2,
    enabled: true,
    autoFreeze: true,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'same-source',
    label: '同源主体命中',
    severity: 'medium',
    description: '存在关联主体线索，需要核查实际控制关系。',
    ownerTeam: '风险运营',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: false,
  },
  {
    code: 'manual-review',
    label: '待人工复核',
    severity: 'low',
    description: '机器预审发现疑点，需人工确认结果。',
    ownerTeam: '资质审核',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: false,
    autoRereview: false,
  },
  {
    code: 'precheck-fail',
    label: '机器预警',
    severity: 'high',
    description: '机器预审已发现明显风险，需要优先人工核验。',
    ownerTeam: '风险运营',
    slaHours: 12,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: true,
  },
  {
    code: 'appeal-backlog',
    label: '申诉积压待处理',
    severity: 'high',
    description: '供应商申诉长时间未处理，存在服务和合规风险。',
    ownerTeam: '供应商管理',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: true,
    autoRereview: false,
  },
  {
    code: 'risk-rereview',
    label: '风险触发重审',
    severity: 'medium',
    description: '风险事件已联动生成重审任务，需要持续跟进。',
    ownerTeam: '资质审核',
    slaHours: 12,
    enabled: true,
    autoFreeze: false,
    autoWatch: false,
    autoRereview: false,
  },
  {
    code: 'supplier-frozen',
    label: '供应商冻结',
    severity: 'critical',
    description: '供应商已处于冻结状态，需要持续追踪解冻条件。',
    ownerTeam: '供应商管理',
    slaHours: 4,
    enabled: true,
    autoFreeze: false,
    autoWatch: false,
    autoRereview: false,
  },
  {
    code: 'supplier-watch',
    label: '纳入重点观察',
    severity: 'medium',
    description: '供应商已列入重点观察名单。',
    ownerTeam: '风险运营',
    slaHours: 24,
    enabled: true,
    autoFreeze: false,
    autoWatch: false,
    autoRereview: false,
  },
]

function createRuleConfigMap() {
  return Object.fromEntries(
    rulePresetList.map((item) => [
      item.code,
      {
        code: item.code,
        label: item.label,
        severity: item.severity,
        description: item.description,
        ownerTeam: item.ownerTeam,
        slaHours: item.slaHours,
        enabled: item.enabled,
        autoFreeze: item.autoFreeze,
        autoWatch: item.autoWatch,
        autoRereview: item.autoRereview,
      },
    ]),
  )
}

const ruleConfigState = reactive(createRuleConfigMap())
const eventDispositionState = reactive({})

const draftFilters = reactive({
  keyword: '',
  lifecycle: '',
  riskLevel: '',
  timeRange: '30d',
})

const appliedFilters = reactive({
  keyword: '',
  lifecycle: '',
  riskLevel: '',
  timeRange: '30d',
})

const eventFilters = reactive({
  kind: '',
  status: '',
})

const lifecycleOptions = [
  { label: '正常', value: 'active' },
  { label: '重点观察', value: 'watch' },
  { label: '已冻结', value: 'frozen' },
]

const riskLevelOptions = [
  { label: '高风险', value: 'critical' },
  { label: '重点关注', value: 'high' },
  { label: '跟进观察', value: 'medium' },
  { label: '低风险', value: 'low' },
]

const timeRangeOptions = Object.entries(timeRangeConfigs).map(([value, item]) => ({
  label: item.label,
  value,
}))

const eventKindOptions = [
  { label: '规则命中', value: 'rule_hit' },
  { label: '申诉积压', value: 'appeal' },
  { label: '重审联动', value: 'rereview' },
  { label: '生命周期动作', value: 'lifecycle' },
]

const eventStatusOptions = [
  { label: '待处置', value: 'pending' },
  { label: '处置中', value: 'in_progress' },
  { label: '已联动', value: 'linked' },
  { label: '已处理', value: 'resolved' },
  { label: '误报挂起', value: 'suppressed' },
]

function supplierTypeLabel(value) {
  return standardsStore.supplierTypes.find((item) => item.value === value)?.label || value
}

function lifecycleMeta(status) {
  return {
    active: { label: '正常', type: 'success' },
    watch: { label: '重点观察', type: 'warning' },
    frozen: { label: '已冻结', type: 'danger' },
  }[status] || { label: status || '未知', type: 'info' }
}

function riskLevelMeta(level) {
  return {
    critical: { label: '高风险', type: 'danger' },
    high: { label: '重点关注', type: 'warning' },
    medium: { label: '跟进观察', type: '' },
    low: { label: '低风险', type: 'success' },
  }[level] || { label: '低风险', type: 'success' }
}

function severityMeta(level) {
  return {
    critical: { label: '紧急', type: 'danger' },
    high: { label: '高', type: 'warning' },
    medium: { label: '中', type: '' },
    low: { label: '低', type: 'success' },
  }[level] || { label: '低', type: 'info' }
}

function rereviewStatusMeta(status) {
  return {
    pending: { label: '待处理', type: 'warning' },
    in_progress: { label: '复审中', type: 'primary' },
    approved: { label: '已通过', type: 'success' },
    rejected: { label: '未通过', type: 'danger' },
    closed: { label: '已关闭', type: 'info' },
  }[status] || { label: status || '未知', type: 'info' }
}

function riskEventCategoryMeta(kind) {
  return {
    rule_hit: { label: '规则命中', type: 'danger' },
    appeal: { label: '申诉积压', type: 'warning' },
    rereview: { label: '重审联动', type: 'primary' },
    lifecycle: { label: '生命周期动作', type: 'info' },
  }[kind] || { label: '风险事件', type: 'info' }
}

function eventDispositionMeta(status) {
  return {
    pending: { label: '待处置', type: 'danger' },
    in_progress: { label: '处置中', type: 'warning' },
    linked: { label: '已联动', type: 'primary' },
    resolved: { label: '已处理', type: 'success' },
    suppressed: { label: '误报挂起', type: 'info' },
  }[status] || { label: '待处置', type: 'danger' }
}

function severityRank(level) {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[level] || 0
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date, offset) {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

function hoursSince(dateText) {
  if (!dateText) return 0
  return Math.max(0, Math.round((Date.now() - new Date(dateText).getTime()) / 3600000))
}

function isRuleEnabled(code) {
  return ruleConfigState[code]?.enabled !== false
}

function isWithinRange(dateText, range) {
  if (!range) return true
  if (!dateText) return false

  const config = timeRangeConfigs[range]
  if (!config) return true

  const current = new Date(dateText)
  if (Number.isNaN(current.getTime())) return false

  const end = endOfDay(new Date())
  const start = startOfDay(addDays(end, -(config.days - 1)))
  return current >= start && current <= end
}

function buildTimeBuckets(range) {
  const config = timeRangeConfigs[range] || timeRangeConfigs['30d']
  const end = endOfDay(new Date())
  const rangeStart = startOfDay(addDays(end, -(config.days - 1)))
  const buckets = []

  for (let index = 0; index < config.bucketCount; index += 1) {
    const bucketStart = startOfDay(addDays(rangeStart, index * config.stepDays))
    let bucketEnd = endOfDay(addDays(bucketStart, config.stepDays - 1))
    if (bucketEnd > end) bucketEnd = end

    const label =
      config.stepDays === 1
        ? `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`
        : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}-${bucketEnd.getMonth() + 1}/${bucketEnd.getDate()}`

    buckets.push({
      key: `${range}-${index}`,
      label,
      start: bucketStart,
      end: bucketEnd,
    })
  }

  return buckets
}

function appealStatusLabel(status) {
  return {
    submitted: '申诉已提交',
    under_review: '申诉复核中',
    supplement_required: '待补充材料',
    accepted: '申诉成立',
    rejected: '申诉驳回',
    closed: '申诉已结案',
  }[status] || '申诉处理中'
}

function defaultEventDisposition(event) {
  if (event.linkedTaskId || event.kind === 'rereview') return 'linked'
  if (event.kind === 'lifecycle' && event.ruleCode === 'supplier-frozen') return 'in_progress'
  return 'pending'
}

function getEventDisposition(event) {
  return eventDispositionState[event.id] || defaultEventDisposition(event)
}

function collectSupplierRiskEvents({ supplier, riskRecords, appeals, rereviewTasks }) {
  const events = []

  riskRecords.forEach((record) => {
    const linkedTask =
      rereviewTasks.find((item) => item.recordId === record.id) ||
      rereviewTasks.find((item) => item.category && item.category === record.category)

    record.riskAlerts.forEach((alert, index) => {
      if (!isRuleEnabled(alert.code)) return

      events.push({
        id: `evt-${record.id}-${alert.code}-${index}`,
        supplierId: supplier.id,
        supplierName: supplier.enterprise.enterpriseName,
        kind: 'rule_hit',
        ruleCode: alert.code,
        ruleLabel: alert.label,
        severity: alert.severity,
        at: record.reviewedAt || record.uploadedAt || supplier.lifecycle.lastRiskScanAt,
        recordId: record.id,
        fileName: record.fileName,
        detail: alert.description,
        linkedTaskId: linkedTask?.id || '',
        linkedTaskNo: linkedTask?.taskNo || '',
        linkedTaskStatus: linkedTask?.status || '',
        linkedTaskStatusMeta: rereviewStatusMeta(linkedTask?.status),
      })
    })
  })

  if (isRuleEnabled('appeal-backlog')) {
    appeals
      .filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status))
      .forEach((appeal) => {
        events.push({
          id: `evt-appeal-${appeal.id}`,
          supplierId: supplier.id,
          supplierName: supplier.enterprise.enterpriseName,
          kind: 'appeal',
          ruleCode: 'appeal-backlog',
          ruleLabel: '申诉积压待处理',
          severity: appeal.status === 'supplement_required' ? 'medium' : 'high',
          at: appeal.updatedAt || appeal.submittedAt,
          recordId: appeal.recordId,
          fileName: appeal.recordName || '',
          detail: `${appeal.title || '申诉事项'} · 当前状态 ${appealStatusLabel(appeal.status)}`,
          linkedTaskId: '',
          linkedTaskNo: '',
          linkedTaskStatus: '',
          linkedTaskStatusMeta: rereviewStatusMeta(''),
        })
      })
  }

  if (isRuleEnabled('risk-rereview')) {
    rereviewTasks
      .filter((item) => item.triggerSource === 'risk-radar')
      .forEach((task) => {
        const statusMeta = rereviewStatusMeta(task.status)
        events.push({
          id: `evt-rereview-${task.id}`,
          supplierId: supplier.id,
          supplierName: supplier.enterprise.enterpriseName,
          kind: 'rereview',
          ruleCode: 'risk-rereview',
          ruleLabel: '风险触发重审',
          severity: ['pending', 'in_progress'].includes(task.status) ? 'medium' : 'low',
          at: task.updatedAt || task.createdAt,
          recordId: task.recordId,
          fileName: task.fileName || '',
          detail: `${task.taskNo} · ${task.reason || '已生成重审任务'}`,
          linkedTaskId: task.id,
          linkedTaskNo: task.taskNo,
          linkedTaskStatus: task.status,
          linkedTaskStatusMeta: statusMeta,
        })
      })
  }

  if (supplier.lifecycle.status === 'frozen' && isRuleEnabled('supplier-frozen')) {
    events.push({
      id: `evt-life-${supplier.id}-frozen`,
      supplierId: supplier.id,
      supplierName: supplier.enterprise.enterpriseName,
      kind: 'lifecycle',
      ruleCode: 'supplier-frozen',
      ruleLabel: '供应商冻结',
      severity: 'critical',
      at: supplier.lifecycle.lastRiskScanAt,
      recordId: '',
      fileName: '',
      detail: supplier.lifecycle.freezeReason || '供应商已被冻结。',
      linkedTaskId: '',
      linkedTaskNo: '',
      linkedTaskStatus: '',
      linkedTaskStatusMeta: rereviewStatusMeta(''),
    })
  }

  if (supplier.lifecycle.status === 'watch' && isRuleEnabled('supplier-watch')) {
    events.push({
      id: `evt-life-${supplier.id}-watch`,
      supplierId: supplier.id,
      supplierName: supplier.enterprise.enterpriseName,
      kind: 'lifecycle',
      ruleCode: 'supplier-watch',
      ruleLabel: '纳入重点观察',
      severity: 'medium',
      at: supplier.lifecycle.lastRiskScanAt,
      recordId: '',
      fileName: '',
      detail: supplier.lifecycle.freezeReason || '供应商已纳入重点观察名单。',
      linkedTaskId: '',
      linkedTaskNo: '',
      linkedTaskStatus: '',
      linkedTaskStatusMeta: rereviewStatusMeta(''),
    })
  }

  return events
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at) || severityRank(b.severity) - severityRank(a.severity))
}

function buildSupplierRadarRow(supplier) {
  const records = reviewsStore.recordsBySupplier(supplier.id)
  const riskRecords = reviewsStore.riskRecordsBySupplier(supplier.id)
  const appeals = reviewsStore.appealsBySupplier(supplier.id)
  const rereviewTasks = reviewsStore.rereviewTasksBySupplier(supplier.id)
  const highestRiskRank = riskRecords[0]?.riskStatus?.rank || 0
  const expiredCount = records.filter((item) => item.renewalState.level === 'expired').length
  const expiringCount = records.filter((item) => ['expiring', 'urgent-expiring'].includes(item.renewalState.level)).length
  const sameSourceHits = records.reduce((sum, item) => sum + (item.sameSourceMatches?.length || 0), 0)
  const latestRecord = records[0]
  const alertLabels = []

  riskRecords.forEach((record) => {
    record.riskAlerts.forEach((alert) => {
      if (!isRuleEnabled(alert.code)) return
      if (!alertLabels.includes(alert.label)) {
        alertLabels.push(alert.label)
      }
    })
  })

  const scoreBreakdown = {
    baseRisk: highestRiskRank * 18,
    expired: expiredCount * 24,
    expiring: expiringCount * 12,
    appeals: appeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length * 8,
    sameSource: Math.min(sameSourceHits, 3) * 7,
    lifecycle: supplier.lifecycle.status === 'frozen' ? 18 : supplier.lifecycle.status === 'watch' ? 8 : 0,
  }

  const riskScore = Math.min(100, Object.values(scoreBreakdown).reduce((sum, item) => sum + item, 0))

  const riskLevel =
    supplier.lifecycle.status === 'frozen'
      ? 'critical'
      : riskScore >= 70
        ? 'critical'
        : riskScore >= 45
          ? 'high'
          : riskScore >= 20
            ? 'medium'
            : 'low'

  const riskEvents = collectSupplierRiskEvents({
    supplier,
    riskRecords,
    appeals,
    rereviewTasks,
  })

  return {
    id: supplier.id,
    supplierName: supplier.enterprise.enterpriseName,
    supplierType: supplier.enterprise.supplierType,
    supplierTypeLabel: supplierTypeLabel(supplier.enterprise.supplierType),
    lifecycleStatus: supplier.lifecycle.status,
    lifecycleMeta: lifecycleMeta(supplier.lifecycle.status),
    archiveSource: supplier.lifecycle.archiveSource,
    lastRiskScanAt: supplier.lifecycle.lastRiskScanAt,
    latestReviewTrigger: supplier.lifecycle.latestReviewTrigger,
    freezeReason: supplier.lifecycle.freezeReason,
    tags: supplier.lifecycle.tags || [],
    lifecycleLogs: supplier.lifecycle.lifecycleLogs || [],
    recordCount: records.length,
    riskRecordCount: riskRecords.length,
    expiredCount,
    expiringCount,
    sameSourceHits,
    appealActiveCount: appeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length,
    activeRereviewCount: rereviewTasks.filter((item) => ['pending', 'in_progress'].includes(item.status)).length,
    riskLevel,
    riskLevelMeta: riskLevelMeta(riskLevel),
    riskScore,
    scoreBreakdown,
    latestRecord,
    latestRiskEventAt: riskEvents[0]?.at || supplier.lifecycle.lastRiskScanAt,
    topAlerts: alertLabels.slice(0, 4),
    riskRecords,
    relatedRereviewTasks: rereviewTasks,
    riskEvents,
  }
}

const radarRows = computed(() => suppliersStore.suppliers.map(buildSupplierRadarRow).sort((a, b) => b.riskScore - a.riskScore))

const filteredRows = computed(() =>
  radarRows.value.filter((item) => {
    const keyword = normalizeKeyword(appliedFilters.keyword)
    const keywordMatched =
      !keyword ||
      normalizeKeyword(item.supplierName).includes(keyword) ||
      normalizeKeyword(item.supplierTypeLabel).includes(keyword) ||
      normalizeKeyword(item.topAlerts.join(' ')).includes(keyword)
    const lifecycleMatched = !appliedFilters.lifecycle || item.lifecycleStatus === appliedFilters.lifecycle
    const riskMatched = !appliedFilters.riskLevel || item.riskLevel === appliedFilters.riskLevel
    const timeMatched =
      !appliedFilters.timeRange ||
      item.riskEvents.some((event) => isWithinRange(event.at, appliedFilters.timeRange)) ||
      isWithinRange(item.lastRiskScanAt, appliedFilters.timeRange)
    return keywordMatched && lifecycleMatched && riskMatched && timeMatched
  }),
)

const visibleRiskEvents = computed(() =>
  filteredRows.value
    .flatMap((item) => item.riskEvents.filter((event) => isWithinRange(event.at, appliedFilters.timeRange)))
    .sort((a, b) => new Date(b.at) - new Date(a.at) || severityRank(b.severity) - severityRank(a.severity)),
)

const focusSupplier = computed(() => {
  const fromFiltered = filteredRows.value.find((item) => item.id === selectedSupplierId.value)
  if (fromFiltered) return fromFiltered
  return filteredRows.value[0] || radarRows.value[0]
})

const totalRiskSuppliers = computed(() => filteredRows.value.filter((item) => item.riskLevel !== 'low').length)
const frozenSupplierCount = computed(() => filteredRows.value.filter((item) => item.lifecycleStatus === 'frozen').length)
const expiredRecordCount = computed(() => filteredRows.value.reduce((sum, item) => sum + item.expiredCount, 0))
const triggeredReviewCount = computed(() => visibleRiskEvents.value.filter((item) => item.kind === 'rereview').length)

const trendBuckets = computed(() => {
  const buckets = buildTimeBuckets(appliedFilters.timeRange)
  const maxCount = buckets.reduce((max, bucket) => {
    const count = visibleRiskEvents.value.filter((event) => {
      const current = new Date(event.at)
      return current >= bucket.start && current <= bucket.end
    }).length
    return Math.max(max, count)
  }, 0)

  return buckets.map((bucket) => {
    const events = visibleRiskEvents.value.filter((event) => {
      const current = new Date(event.at)
      return current >= bucket.start && current <= bucket.end
    })

    return {
      ...bucket,
      total: events.length,
      ruleHits: events.filter((item) => item.kind === 'rule_hit').length,
      rereviewLinks: events.filter((item) => item.kind === 'rereview').length,
      height: maxCount ? Math.max(18, Math.round((events.length / maxCount) * 100)) : 18,
    }
  })
})

const riskTrendSummary = computed(() => {
  const totalEvents = visibleRiskEvents.value.length
  const ruleHits = visibleRiskEvents.value.filter((item) => item.kind === 'rule_hit').length
  const rereviewLinks = visibleRiskEvents.value.filter((item) => item.kind === 'rereview').length
  const appealBacklogs = visibleRiskEvents.value.filter((item) => item.kind === 'appeal').length
  const pendingEvents = visibleRiskEvents.value.filter((item) => getEventDisposition(item) === 'pending').length
  const peakBucket = trendBuckets.value.slice().sort((a, b) => b.total - a.total)[0]

  return {
    totalEvents,
    ruleHits,
    rereviewLinks,
    appealBacklogs,
    pendingEvents,
    peakLabel: peakBucket?.label || '--',
    peakValue: peakBucket?.total || 0,
  }
})

const ruleHitSummary = computed(() => {
  const grouped = new Map()

  visibleRiskEvents.value
    .filter((event) => event.kind !== 'lifecycle')
    .forEach((event) => {
      const existing = grouped.get(event.ruleCode) || {
        ruleCode: event.ruleCode,
        ruleLabel: event.ruleLabel,
        severity: event.severity,
        severityMeta: severityMeta(event.severity),
        latestAt: event.at,
        count: 0,
        supplierIds: new Set(),
        recordIds: new Set(),
        linkedTaskIds: new Set(),
        sampleDetail: event.detail,
      }

      existing.count += 1
      existing.latestAt = new Date(event.at) > new Date(existing.latestAt) ? event.at : existing.latestAt
      if (severityRank(event.severity) > severityRank(existing.severity)) {
        existing.severity = event.severity
        existing.severityMeta = severityMeta(event.severity)
      }
      existing.supplierIds.add(event.supplierId)
      if (event.recordId) existing.recordIds.add(event.recordId)
      if (event.linkedTaskId) existing.linkedTaskIds.add(event.linkedTaskId)
      grouped.set(event.ruleCode, existing)
    })

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      supplierCount: item.supplierIds.size,
      recordCount: item.recordIds.size,
      linkedTaskCount: item.linkedTaskIds.size,
    }))
    .sort((a, b) => b.count - a.count || severityRank(b.severity) - severityRank(a.severity) || new Date(b.latestAt) - new Date(a.latestAt))
})

const activeRuleSummary = computed(() => ruleHitSummary.value.find((item) => item.ruleCode === activeRuleCode.value))

const activeRuleDetailRows = computed(() =>
  visibleRiskEvents.value.filter((item) => item.ruleCode === activeRuleCode.value).slice(0, 50),
)

const ruleConfigRows = computed(() => {
  const summaryMap = Object.fromEntries(ruleHitSummary.value.map((item) => [item.ruleCode, item]))
  return Object.keys(ruleConfigState)
    .map((code) => {
      const config = ruleConfigState[code]
      const summary = summaryMap[code]
      return {
        code,
        config,
        label: config.label,
        severity: config.severity,
        description: config.description,
        hitCount: summary?.count || 0,
        supplierCount: summary?.supplierCount || 0,
        linkedTaskCount: summary?.linkedTaskCount || 0,
        latestAt: summary?.latestAt || '',
      }
    })
    .sort((a, b) => b.hitCount - a.hitCount || severityRank(b.severity) - severityRank(a.severity))
})

const focusSupplierRuleHits = computed(() => {
  if (!focusSupplier.value) return []

  const grouped = new Map()
  focusSupplier.value.riskEvents
    .filter((item) => isWithinRange(item.at, appliedFilters.timeRange))
    .filter((item) => item.kind !== 'lifecycle')
    .forEach((event) => {
      const existing = grouped.get(event.ruleCode) || {
        ruleCode: event.ruleCode,
        ruleLabel: event.ruleLabel,
        count: 0,
        severity: event.severity,
        severityMeta: severityMeta(event.severity),
        latestAt: event.at,
      }
      existing.count += 1
      existing.latestAt = new Date(event.at) > new Date(existing.latestAt) ? event.at : existing.latestAt
      if (severityRank(event.severity) > severityRank(existing.severity)) {
        existing.severity = event.severity
        existing.severityMeta = severityMeta(event.severity)
      }
      grouped.set(event.ruleCode, existing)
    })

  return Array.from(grouped.values()).sort(
    (a, b) => b.count - a.count || severityRank(b.severity) - severityRank(a.severity) || new Date(b.latestAt) - new Date(a.latestAt),
  )
})

const focusSupplierEventTimeline = computed(() =>
  (focusSupplier.value?.riskEvents || []).filter((item) => isWithinRange(item.at, appliedFilters.timeRange)).slice(0, 8),
)

const focusSupplierRereviewTasks = computed(() =>
  (focusSupplier.value?.relatedRereviewTasks || []).filter(
    (item) => isWithinRange(item.updatedAt || item.createdAt, appliedFilters.timeRange) || ['pending', 'in_progress'].includes(item.status),
  ),
)

const focusSupplierScoreCards = computed(() => {
  if (!focusSupplier.value) return []

  const breakdown = focusSupplier.value.scoreBreakdown
  const maxPart = Math.max(24, ...Object.values(breakdown))
  const rows = [
    { key: 'baseRisk', label: '基础风险', value: breakdown.baseRisk, note: '按最高风险档案等级计入', tone: 'danger' },
    { key: 'expired', label: '过期证书', value: breakdown.expired, note: `共 ${focusSupplier.value.expiredCount} 份`, tone: 'danger' },
    { key: 'expiring', label: '临期证书', value: breakdown.expiring, note: `共 ${focusSupplier.value.expiringCount} 份`, tone: 'warning' },
    { key: 'appeals', label: '申诉积压', value: breakdown.appeals, note: `共 ${focusSupplier.value.appealActiveCount} 条`, tone: 'warning' },
    { key: 'sameSource', label: '同源命中', value: breakdown.sameSource, note: `共 ${focusSupplier.value.sameSourceHits} 条`, tone: 'info' },
    { key: 'lifecycle', label: '生命周期状态', value: breakdown.lifecycle, note: focusSupplier.value.lifecycleMeta.label, tone: 'info' },
  ]

  return rows.map((item) => ({
    ...item,
    width: maxPart ? Math.max(10, Math.round((item.value / maxPart) * 100)) : 10,
  }))
})

const eventWorkbenchRows = computed(() =>
  visibleRiskEvents.value
    .map((event) => {
      const ruleConfig = ruleConfigState[event.ruleCode]
      const disposition = getEventDisposition(event)

      return {
        ...event,
        disposition,
        dispositionMeta: eventDispositionMeta(disposition),
        categoryMeta: riskEventCategoryMeta(event.kind),
        severityMeta: severityMeta(event.severity),
        ownerTeam: ruleConfig?.ownerTeam || '风险运营',
        slaHours: ruleConfig?.slaHours || 24,
        ageHours: hoursSince(event.at),
        canTriggerRereview: Boolean(event.recordId) && !event.linkedTaskId && ruleConfig?.autoRereview !== false,
      }
    })
    .filter((item) => (!eventFilters.kind || item.kind === eventFilters.kind) && (!eventFilters.status || item.disposition === eventFilters.status)),
)

const eventWorkbenchSummary = computed(() => ({
  pending: eventWorkbenchRows.value.filter((item) => item.disposition === 'pending').length,
  inProgress: eventWorkbenchRows.value.filter((item) => item.disposition === 'in_progress').length,
  linked: eventWorkbenchRows.value.filter((item) => item.disposition === 'linked').length,
  resolved: eventWorkbenchRows.value.filter((item) => item.disposition === 'resolved').length,
  suppressed: eventWorkbenchRows.value.filter((item) => item.disposition === 'suppressed').length,
}))

const overviewSupplierRows = computed(() => filteredRows.value.slice(0, 5))

const overviewEventRows = computed(() =>
  visibleRiskEvents.value.slice(0, 6).map((event) => ({
    ...event,
    disposition: getEventDisposition(event),
    dispositionMeta: eventDispositionMeta(getEventDisposition(event)),
    categoryMeta: riskEventCategoryMeta(event.kind),
  })),
)

const scanBatchRows = computed(() =>
  buildTimeBuckets(appliedFilters.timeRange)
    .map((bucket, index) => {
      const events = visibleRiskEvents.value.filter((event) => {
        const current = new Date(event.at)
        return current >= bucket.start && current <= bucket.end
      })
      const suppliers = filteredRows.value.filter((item) => {
        const current = new Date(item.lastRiskScanAt)
        return current >= bucket.start && current <= bucket.end
      })
      const frozenCount = suppliers.filter((item) => item.lifecycleStatus === 'frozen').length
      return {
        id: `${bucket.key}-scan`,
        batchNo: `SCAN-${appliedFilters.timeRange.toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
        label: bucket.label,
        status: index === buildTimeBuckets(appliedFilters.timeRange).length - 1 ? 'running' : 'completed',
        scannedSupplierCount: suppliers.length,
        hitCount: events.length,
        criticalCount: events.filter((item) => item.severity === 'critical').length,
        linkedCount: events.filter((item) => item.linkedTaskId).length,
        frozenCount,
      }
    })
    .filter((item) => item.scannedSupplierCount || item.hitCount)
    .reverse()
    .slice(0, 4),
)

watch(
  filteredRows,
  (value) => {
    if (!value.length) {
      selectedSupplierId.value = ''
      return
    }

    if (!value.some((item) => item.id === selectedSupplierId.value)) {
      selectedSupplierId.value = value[0].id
    }
  },
  { immediate: true },
)

watch(
  ruleHitSummary,
  (value) => {
    if (!value.length) {
      activeRuleCode.value = ''
      ruleDrawerVisible.value = false
      return
    }

    if (!value.some((item) => item.ruleCode === activeRuleCode.value)) {
      activeRuleCode.value = value[0].ruleCode
    }
  },
  { immediate: true },
)

function applyFilters() {
  Object.assign(appliedFilters, draftFilters)
}

function resetFilters() {
  Object.assign(draftFilters, {
    keyword: '',
    lifecycle: '',
    riskLevel: '',
    timeRange: '30d',
  })
  Object.assign(appliedFilters, {
    keyword: '',
    lifecycle: '',
    riskLevel: '',
    timeRange: '30d',
  })
}

function setFocusSupplier(row) {
  if (!row) return
  selectedSupplierId.value = row.id
}

function openRuleDrawer(ruleCode) {
  if (!ruleCode) return
  activeRuleCode.value = ruleCode
  ruleDrawerVisible.value = true
}

function locateSupplierFromEvent(event) {
  const supplier =
    filteredRows.value.find((item) => item.id === event.supplierId) || radarRows.value.find((item) => item.id === event.supplierId)
  if (!supplier) return
  setFocusSupplier(supplier)
  ruleDrawerVisible.value = false
}

function beginEventHandling(event) {
  eventDispositionState[event.id] = 'in_progress'
  locateSupplierFromEvent(event)
  ElMessage.success('已将该风险事件加入处置中。')
}

function resolveEvent(event) {
  eventDispositionState[event.id] = 'resolved'
  ElMessage.success('已标记为处理完成。')
}

function suppressEvent(event) {
  eventDispositionState[event.id] = 'suppressed'
  ElMessage.success('已标记为误报挂起。')
}

function restoreRuleConfig(code) {
  const defaults = createRuleConfigMap()[code]
  if (!defaults) return
  Object.assign(ruleConfigState[code], defaults)
  ElMessage.success('已恢复该规则的默认配置。')
}

function saveRuleConfig(label) {
  ElMessage.success(`已保存“${label}”的风控规则配置。`)
}

function toggleFreeze(row) {
  try {
    if (row.lifecycleStatus === 'frozen') {
      suppliersStore.updateLifecycleStatus(row.id, {
        status: 'active',
        reason: '管理员解除冻结，等待后续常态巡检。',
        operatorName: authStore.displayName,
        source: 'risk-radar',
      })
      ElMessage.success('供应商已解除冻结。')
    } else {
      suppliersStore.updateLifecycleStatus(row.id, {
        status: 'frozen',
        reason: row.topAlerts[0] ? `命中风险：${row.topAlerts[0]}` : '命中高风险规则，先行冻结。',
        operatorName: authStore.displayName,
        source: 'risk-radar',
      })
      ElMessage.success('供应商已冻结，并记录至生命周期日志。')
    }
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function markWatch(row) {
  try {
    suppliersStore.updateLifecycleStatus(row.id, {
      status: 'watch',
      reason: row.topAlerts[0] ? `进入重点观察：${row.topAlerts[0]}` : '存在中高风险项，纳入重点观察。',
      operatorName: authStore.displayName,
      source: 'risk-radar',
    })
    suppliersStore.updateSupplierTags(row.id, row.topAlerts.slice(0, 3))
    ElMessage.success('供应商已标记为重点观察。')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function triggerRereview(row, event = null) {
  try {
    const targetRecordId = event?.recordId || row.riskRecords[0]?.id || row.latestRecord?.id
    if (!targetRecordId) {
      throw new Error('当前供应商暂无可关联的资质文件，暂时无法生成重审任务。')
    }

    const targetRecord =
      row.riskRecords.find((item) => item.id === targetRecordId) ||
      reviewsStore.getRecord(targetRecordId) ||
      row.latestRecord
    const reason =
      event?.ruleLabel && event?.fileName
        ? `因“${event.ruleLabel}”命中，针对《${event.fileName}》触发变更重审`
        : row.topAlerts[0]
          ? `因“${row.topAlerts[0]}”触发变更重审`
          : '因动态风控结果触发变更重审'

    reviewsStore.createRereviewTask({
      supplierId: row.id,
      recordId: targetRecordId,
      category: targetRecord?.category || '',
      triggerSource: 'risk-radar',
      taskType: row.expiredCount > 0 ? 'renewal' : 'change',
      operatorName: authStore.displayName,
      reason,
    })
    if (event) {
      eventDispositionState[event.id] = 'linked'
    }
    ElMessage.success('已生成重审任务，可前往复审台继续处理。')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function triggerRereviewFromEvent(event) {
  const supplier = radarRows.value.find((item) => item.id === event.supplierId)
  if (!supplier) return
  triggerRereview(supplier, event)
}

function openSupplierManagement(row) {
  router.push(`/admin/suppliers?supplierId=${row.id}`)
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>动态风控雷达</h1>
        <p>把风险趋势、规则配置、事件处置、重审联动和供应商画像放在同一个后台里，形成完整的风控运营工作台。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="风险供应商" :value="totalRiskSuppliers" hint="当前筛选范围内存在中高风险事件的供应商" tone="danger" />
      <StatCard label="已冻结供应商" :value="frozenSupplierCount" hint="当前处于冻结状态、需补齐资料后再复核的供应商" />
      <StatCard label="过期证书" :value="expiredRecordCount" hint="筛选范围内命中的已过期资质文件数量" tone="danger" />
      <StatCard label="待处置事件" :value="riskTrendSummary.pendingEvents" hint="尚未进入处置中、联动或关闭状态的风险事件数量" tone="warning" />
    </div>

    <div class="section-card radar-shell-card">
      <div class="radar-view-switch">
        <el-radio-group v-model="activeRadarView" size="large">
          <el-radio-button label="overview">总览看板</el-radio-button>
          <el-radio-button label="suppliers">供应商雷达</el-radio-button>
          <el-radio-button label="rules">规则中心</el-radio-button>
          <el-radio-button label="workbench">处置队列</el-radio-button>
        </el-radio-group>
      </div>
      <p class="radar-view-hint">
        当前展示：
        {{
          activeRadarView === 'overview'
            ? '趋势、批次和重点风险快照'
            : activeRadarView === 'suppliers'
              ? '供应商筛查、画像和联动明细'
              : activeRadarView === 'rules'
                ? '规则命中概览与规则配置'
                : '风险事件处置与联动重审'
        }}
      </p>
    </div>

    <div v-if="activeRadarView === 'overview'" class="content-grid">
      <div class="content-grid insight-grid">
        <div class="section-card panel-card">
          <div class="panel-title">
            <div>
              <h3>风险趋势</h3>
              <p>{{ timeRangeConfigs[appliedFilters.timeRange].label }} 内的风险事件变化与联动情况</p>
            </div>
            <el-tag type="info">{{ riskTrendSummary.peakLabel }} 峰值 {{ riskTrendSummary.peakValue }}</el-tag>
          </div>

          <div class="trend-summary-row">
            <div class="trend-summary-item">
              <span>事件总量</span>
              <strong>{{ riskTrendSummary.totalEvents }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>规则命中</span>
              <strong>{{ riskTrendSummary.ruleHits }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>联动重审</span>
              <strong>{{ riskTrendSummary.rereviewLinks }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>申诉积压</span>
              <strong>{{ riskTrendSummary.appealBacklogs }}</strong>
            </div>
          </div>

          <div class="trend-bars">
            <div v-for="bucket in trendBuckets" :key="bucket.key" class="trend-bar-item">
              <div class="trend-bar-shell">
                <div class="trend-bar-fill" :style="{ height: `${bucket.height}%` }" />
              </div>
              <strong>{{ bucket.total }}</strong>
              <span>{{ bucket.label }}</span>
              <small>命中 {{ bucket.ruleHits }} · 重审 {{ bucket.rereviewLinks }}</small>
            </div>
          </div>
        </div>

        <div class="section-card panel-card">
          <div class="panel-title">
            <div>
              <h3>巡检批次摘要</h3>
              <p>按当前时间范围聚合最近巡检批次、命中数和联动结果</p>
            </div>
            <el-tag type="success">{{ scanBatchRows.length }} 个批次</el-tag>
          </div>

          <div v-if="scanBatchRows.length" class="scan-grid">
            <div v-for="item in scanBatchRows" :key="item.id" class="scan-card">
              <div class="rule-summary-head">
                <strong>{{ item.batchNo }}</strong>
                <el-tag :type="item.status === 'running' ? 'warning' : 'success'">
                  {{ item.status === 'running' ? '巡检中' : '已完成' }}
                </el-tag>
              </div>
              <p>{{ item.label }} · 扫描 {{ item.scannedSupplierCount }} 家供应商</p>
              <div class="rule-summary-metrics">
                <span>命中 {{ item.hitCount }}</span>
                <span>紧急 {{ item.criticalCount }}</span>
                <span>联动 {{ item.linkedCount }}</span>
                <span>冻结 {{ item.frozenCount }}</span>
              </div>
            </div>
          </div>
          <div v-else class="rich-empty compact-empty">当前时间范围内暂无巡检批次摘要。</div>
        </div>
      </div>

      <div class="content-grid insight-grid">
        <div class="section-card panel-card">
          <div class="panel-title">
            <div>
              <h3>重点供应商快照</h3>
              <p>先看当前风险分最高、最值得优先跟进的供应商</p>
            </div>
            <el-tag type="danger">{{ overviewSupplierRows.length }} 家</el-tag>
          </div>
          <div v-if="overviewSupplierRows.length" class="supplier-list">
            <button
              v-for="item in overviewSupplierRows"
              :key="item.id"
              type="button"
              class="supplier-item compact-supplier-item"
              @click="activeRadarView = 'suppliers'; setFocusSupplier(item)"
            >
              <div class="supplier-item-head">
                <div>
                  <strong>{{ item.supplierName }}</strong>
                  <p>{{ item.supplierTypeLabel }}</p>
                </div>
                <el-tag :type="item.riskLevelMeta.type">{{ item.riskLevelMeta.label }}</el-tag>
              </div>
              <div class="supplier-item-metrics">
                <span>风险分 {{ item.riskScore }}</span>
                <span>过期 {{ item.expiredCount }}</span>
                <span>重审 {{ item.activeRereviewCount }}</span>
              </div>
            </button>
          </div>
          <div v-else class="rich-empty compact-empty">当前没有重点供应商快照。</div>
        </div>

        <div class="section-card panel-card">
          <div class="panel-title">
            <div>
              <h3>最新风险事件</h3>
              <p>展示最近进入视野的风险事件，便于快速切到处置队列</p>
            </div>
            <el-tag type="warning">{{ overviewEventRows.length }} 条</el-tag>
          </div>
          <div v-if="overviewEventRows.length" class="timeline-list">
            <div v-for="item in overviewEventRows" :key="item.id" class="timeline-item">
              <div class="timeline-head">
                <strong>{{ item.ruleLabel }}</strong>
                <el-tag :type="item.dispositionMeta.type">{{ item.dispositionMeta.label }}</el-tag>
              </div>
              <span>{{ item.supplierName }} · {{ formatDateTime(item.at) }}</span>
              <p>{{ item.detail }}</p>
            </div>
          </div>
          <div v-else class="rich-empty compact-empty">当前没有最新风险事件。</div>
        </div>
      </div>
    </div>

    <div v-else-if="activeRadarView === 'rules'" class="content-grid module-grid">
      <div class="section-card panel-card">
        <div class="panel-title">
          <div>
            <h3>规则命中概览</h3>
            <p>按规则聚合查看命中次数、影响供应商数和已联动重审数</p>
          </div>
          <el-tag type="warning">{{ ruleHitSummary.length }} 条规则</el-tag>
        </div>

        <div v-if="ruleHitSummary.length" class="rule-summary-grid">
          <button
            v-for="rule in ruleHitSummary.slice(0, 6)"
            :key="rule.ruleCode"
            type="button"
            class="rule-summary-card"
            @click="openRuleDrawer(rule.ruleCode)"
          >
            <div class="rule-summary-head">
              <strong>{{ rule.ruleLabel }}</strong>
              <el-tag :type="rule.severityMeta.type">{{ rule.severityMeta.label }}</el-tag>
            </div>
            <p>{{ rule.sampleDetail }}</p>
            <div class="rule-summary-metrics">
              <span>命中 {{ rule.count }}</span>
              <span>供应商 {{ rule.supplierCount }}</span>
              <span>联动重审 {{ rule.linkedTaskCount }}</span>
            </div>
          </button>
        </div>
        <div v-else class="rich-empty compact-empty">当前筛选范围内暂无可展示的规则命中明细。</div>
      </div>

      <div class="section-card panel-card">
        <div class="panel-title">
          <div>
            <h3>风控规则配置台</h3>
            <p>调整规则开关、SLA、责任团队以及自动冻结/观察/重审策略</p>
          </div>
          <el-tag type="info">{{ ruleConfigRows.length }} 条配置</el-tag>
        </div>

        <div class="rule-config-grid">
          <div v-for="item in ruleConfigRows" :key="item.code" class="rule-config-card">
            <div class="rule-summary-head">
              <strong>{{ item.label }}</strong>
              <el-tag :type="severityMeta(item.severity).type">{{ severityMeta(item.severity).label }}</el-tag>
            </div>
            <p>{{ item.description }}</p>
            <div class="rule-config-meta">
              <span>命中 {{ item.hitCount }}</span>
              <span>供应商 {{ item.supplierCount }}</span>
              <span>联动 {{ item.linkedTaskCount }}</span>
            </div>
            <div class="rule-config-form">
              <div class="mini-field">
                <span>启用</span>
                <el-switch v-model="item.config.enabled" />
              </div>
              <div class="mini-field">
                <span>责任团队</span>
                <el-select v-model="item.config.ownerTeam" size="small">
                  <el-option v-for="team in ownerTeamOptions" :key="team" :label="team" :value="team" />
                </el-select>
              </div>
              <div class="mini-field">
                <span>SLA(小时)</span>
                <el-input-number v-model="item.config.slaHours" :min="1" :max="72" size="small" />
              </div>
              <div class="switch-row">
                <el-switch v-model="item.config.autoFreeze" size="small" />
                <span>自动冻结</span>
              </div>
              <div class="switch-row">
                <el-switch v-model="item.config.autoWatch" size="small" />
                <span>自动观察</span>
              </div>
              <div class="switch-row">
                <el-switch v-model="item.config.autoRereview" size="small" />
                <span>自动重审</span>
              </div>
            </div>
            <div class="toolbar rule-config-actions">
              <el-button size="small" plain @click="restoreRuleConfig(item.code)">恢复默认</el-button>
              <el-button size="small" type="primary" plain @click="saveRuleConfig(item.label)">保存配置</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeRadarView === 'suppliers'" class="content-grid radar-grid">
      <div class="section-card panel-card">
        <div class="toolbar filter-toolbar">
          <el-input
            v-model="draftFilters.keyword"
            placeholder="搜索供应商、供方类型或风险标签"
            clearable
            style="max-width: 280px"
            @keyup.enter="applyFilters"
          />
          <el-select v-model="draftFilters.timeRange" placeholder="时间范围" style="width: 160px">
            <el-option v-for="item in timeRangeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="draftFilters.lifecycle" placeholder="生命周期状态" clearable style="width: 180px">
            <el-option v-for="item in lifecycleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="draftFilters.riskLevel" placeholder="风险等级" clearable style="width: 180px">
            <el-option v-for="item in riskLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="primary" @click="applyFilters">搜索</el-button>
          <el-button plain @click="resetFilters">重置</el-button>
        </div>

        <div v-if="filteredRows.length" class="supplier-list">
          <button
            v-for="item in filteredRows"
            :key="item.id"
            type="button"
            class="supplier-item"
            :class="{ active: focusSupplier?.id === item.id }"
            @click="setFocusSupplier(item)"
          >
            <div class="supplier-item-head">
              <div>
                <strong>{{ item.supplierName }}</strong>
                <p>{{ item.supplierTypeLabel }} · {{ item.recordCount }} 份档案</p>
              </div>
              <el-tag :type="item.riskLevelMeta.type">{{ item.riskLevelMeta.label }}</el-tag>
            </div>
            <div class="capsule-list">
              <el-tag :type="item.lifecycleMeta.type">{{ item.lifecycleMeta.label }}</el-tag>
              <span v-for="tag in item.topAlerts" :key="tag" class="capsule-item">{{ tag }}</span>
            </div>
            <div class="supplier-item-metrics">
              <span>风险分 {{ item.riskScore }}</span>
              <span>过期 {{ item.expiredCount }}</span>
              <span>临期 {{ item.expiringCount }}</span>
              <span>重审 {{ item.activeRereviewCount }}</span>
              <span>申诉 {{ item.appealActiveCount }}</span>
            </div>
          </button>
        </div>
        <div v-else class="rich-empty">当前没有符合条件的供应商风险记录。</div>
      </div>

      <div class="section-card panel-card detail-panel">
        <template v-if="focusSupplier">
          <div class="panel-title">
            <div>
              <h3>{{ focusSupplier.supplierName }}</h3>
              <p>{{ focusSupplier.supplierTypeLabel }} · 最近巡检 {{ formatDateTime(focusSupplier.lastRiskScanAt) }}</p>
            </div>
            <div class="toolbar">
              <el-tag :type="focusSupplier.lifecycleMeta.type">{{ focusSupplier.lifecycleMeta.label }}</el-tag>
              <el-tag :type="focusSupplier.riskLevelMeta.type">{{ focusSupplier.riskLevelMeta.label }}</el-tag>
            </div>
          </div>

          <div class="metric-row">
            <span>电子档案来源</span>
            <strong>{{ focusSupplier.archiveSource === 'admin-created' ? '管理员建档' : '供应商门户建档' }}</strong>
          </div>
          <div class="metric-row">
            <span>当前风险分</span>
            <strong>{{ focusSupplier.riskScore }}</strong>
          </div>
          <div class="metric-row">
            <span>最新风险事件</span>
            <strong>{{ formatDateTime(focusSupplier.latestRiskEventAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>最新重审触发</span>
            <strong>{{ focusSupplier.latestReviewTrigger || '--' }}</strong>
          </div>
          <div class="metric-row" v-if="focusSupplier.freezeReason">
            <span>冻结原因</span>
            <strong class="danger-note">{{ focusSupplier.freezeReason }}</strong>
          </div>

          <div class="section-card action-card">
            <div class="panel-title">
              <div>
                <h3>风控动作</h3>
                <p>支持冻结、重点观察和按当前风险上下文触发重审。</p>
              </div>
            </div>
            <div class="toolbar">
              <el-button type="danger" plain @click="toggleFreeze(focusSupplier)">
                {{ focusSupplier.lifecycleStatus === 'frozen' ? '解除冻结' : '立即冻结' }}
              </el-button>
              <el-button type="warning" plain @click="markWatch(focusSupplier)">设为重点观察</el-button>
              <el-button type="primary" @click="triggerRereview(focusSupplier)">触发重审</el-button>
              <el-button plain @click="openSupplierManagement(focusSupplier)">打开供应商档案</el-button>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">风险分拆解</div>
            <div class="score-breakdown-list">
              <div v-for="item in focusSupplierScoreCards" :key="item.key" class="score-breakdown-item">
                <div class="score-breakdown-head">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.value }} 分</span>
                </div>
                <div class="score-breakdown-bar">
                  <div class="score-breakdown-fill" :class="item.tone" :style="{ width: `${item.width}%` }" />
                </div>
                <small>{{ item.note }}</small>
              </div>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">核心风险标签</div>
            <div class="capsule-list">
              <span v-for="tag in focusSupplier.topAlerts" :key="tag" class="capsule-item">{{ tag }}</span>
              <span v-if="!focusSupplier.topAlerts.length" class="status-text">当前暂无明显风险标签</span>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">规则命中明细</div>
            <div v-if="focusSupplierRuleHits.length" class="rule-chip-grid">
              <button
                v-for="item in focusSupplierRuleHits"
                :key="item.ruleCode"
                type="button"
                class="rule-chip-card"
                @click="openRuleDrawer(item.ruleCode)"
              >
                <strong>{{ item.ruleLabel }}</strong>
                <span>{{ item.count }} 次 · 最新 {{ formatDateTime(item.latestAt) }}</span>
              </button>
            </div>
            <div v-else class="rich-empty compact-empty">当前时间范围内没有新的规则命中记录。</div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">风控事件与复审联动</div>
            <div v-if="focusSupplierRereviewTasks.length" class="linkage-list">
              <div v-for="task in focusSupplierRereviewTasks" :key="task.id" class="linkage-item">
                <div class="risk-record-head">
                  <strong>{{ task.taskNo }}</strong>
                  <el-tag :type="rereviewStatusMeta(task.status).type">{{ rereviewStatusMeta(task.status).label }}</el-tag>
                </div>
                <p>{{ task.reason }}</p>
                <span>{{ task.fileName || '未关联文件' }} · {{ formatDateTime(task.updatedAt || task.createdAt) }}</span>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前时间范围内没有联动的复审任务。</div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">高风险档案</div>
            <div v-if="focusSupplier.riskRecords.length" class="risk-record-list">
              <div v-for="record in focusSupplier.riskRecords.slice(0, 5)" :key="record.id" class="risk-record-item">
                <div class="risk-record-head">
                  <strong>{{ record.fileName }}</strong>
                  <el-tag :type="record.riskStatus.type">{{ record.riskStatus.label }}</el-tag>
                </div>
                <p>{{ record.riskAlerts.filter((item) => isRuleEnabled(item.code)).map((item) => item.label).join('、') || '暂无风险标签' }}</p>
                <span>有效期 {{ formatDate(record.extractedFields.validUntil) }} · 审核状态 {{ record.status }}</span>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前没有高风险档案。</div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">近期风险时间线</div>
            <div v-if="focusSupplierEventTimeline.length" class="timeline-list">
              <div v-for="item in focusSupplierEventTimeline" :key="item.id" class="timeline-item">
                <div class="timeline-head">
                  <strong>{{ item.ruleLabel }}</strong>
                  <el-tag :type="riskEventCategoryMeta(item.kind).type">{{ riskEventCategoryMeta(item.kind).label }}</el-tag>
                </div>
                <span>{{ formatDateTime(item.at) }}</span>
                <p>{{ item.detail }}</p>
                <small v-if="item.linkedTaskNo">关联任务 {{ item.linkedTaskNo }} · {{ item.linkedTaskStatusMeta.label }}</small>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前时间范围内没有新的风险事件。</div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">生命周期日志</div>
            <div v-if="focusSupplier.lifecycleLogs.length" class="timeline-list">
              <div v-for="item in focusSupplier.lifecycleLogs" :key="item.id" class="timeline-item">
                <div class="timeline-head">
                  <strong>{{ item.action }}</strong>
                  <el-tag type="info">生命周期</el-tag>
                </div>
                <span>{{ item.actor }} · {{ formatDateTime(item.at) }}</span>
                <p>{{ item.note }}</p>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前还没有生命周期操作记录。</div>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="section-card panel-card">
      <div class="panel-title">
        <div>
          <h3>风险处置队列</h3>
          <p>按事件类型、状态和SLA查看待办，支持直接联动重审或完成处置。</p>
        </div>
        <div class="toolbar">
          <el-tag type="danger">待处置 {{ eventWorkbenchSummary.pending }}</el-tag>
          <el-tag type="warning">处置中 {{ eventWorkbenchSummary.inProgress }}</el-tag>
          <el-tag type="primary">已联动 {{ eventWorkbenchSummary.linked }}</el-tag>
          <el-tag type="success">已处理 {{ eventWorkbenchSummary.resolved }}</el-tag>
        </div>
      </div>

      <div class="toolbar filter-toolbar">
        <el-select v-model="eventFilters.kind" placeholder="事件类型" clearable style="width: 180px">
          <el-option v-for="item in eventKindOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="eventFilters.status" placeholder="处置状态" clearable style="width: 180px">
          <el-option v-for="item in eventStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button plain @click="eventFilters.kind = ''; eventFilters.status = ''">重置处置筛选</el-button>
      </div>

      <el-table :data="eventWorkbenchRows" class="app-table" stripe>
        <el-table-column label="事件" min-width="220">
          <template #default="{ row }">
            <div class="table-entity">
              <strong>{{ row.ruleLabel }}</strong>
              <span>{{ row.fileName || row.supplierName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="200">
          <template #default="{ row }">{{ row.supplierName }}</template>
        </el-table-column>
        <el-table-column label="类型" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.categoryMeta.type">{{ row.categoryMeta.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.severityMeta.type">{{ row.severityMeta.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处置状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.dispositionMeta.type">{{ row.dispositionMeta.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="责任团队" min-width="120">
          <template #default="{ row }">{{ row.ownerTeam }}</template>
        </el-table-column>
        <el-table-column label="SLA" min-width="120">
          <template #default="{ row }">{{ row.ageHours }}h / {{ row.slaHours }}h</template>
        </el-table-column>
        <el-table-column label="关联任务" min-width="160">
          <template #default="{ row }">
            {{ row.linkedTaskNo ? `${row.linkedTaskNo} · ${row.linkedTaskStatusMeta.label}` : '未联动' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="320" fixed="right">
          <template #default="{ row }">
            <div class="toolbar">
              <el-button text type="primary" @click="locateSupplierFromEvent(row)">定位供应商</el-button>
              <el-button text type="warning" @click="beginEventHandling(row)">开始处置</el-button>
              <el-button
                v-if="row.canTriggerRereview"
                text
                type="primary"
                @click="triggerRereviewFromEvent(row)"
              >
                联动重审
              </el-button>
              <el-button text type="success" @click="resolveEvent(row)">标记完成</el-button>
              <el-button text @click="suppressEvent(row)">误报挂起</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!eventWorkbenchRows.length" class="rich-empty compact-empty">当前筛选条件下没有待展示的风险处置事件。</div>
    </div>

    <el-drawer
      v-model="ruleDrawerVisible"
      title="规则命中明细"
      size="720px"
      append-to-body
      destroy-on-close
    >
      <template v-if="activeRuleSummary">
        <div class="drawer-summary">
          <div class="drawer-summary-head">
            <div>
              <h3>{{ activeRuleSummary.ruleLabel }}</h3>
              <p>{{ activeRuleSummary.sampleDetail }}</p>
            </div>
            <el-tag :type="activeRuleSummary.severityMeta.type">{{ activeRuleSummary.severityMeta.label }}</el-tag>
          </div>
          <div class="trend-summary-row">
            <div class="trend-summary-item">
              <span>命中次数</span>
              <strong>{{ activeRuleSummary.count }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>影响供应商</span>
              <strong>{{ activeRuleSummary.supplierCount }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>关联档案</span>
              <strong>{{ activeRuleSummary.recordCount }}</strong>
            </div>
            <div class="trend-summary-item">
              <span>联动重审</span>
              <strong>{{ activeRuleSummary.linkedTaskCount }}</strong>
            </div>
          </div>
        </div>

        <div v-if="activeRuleDetailRows.length" class="drawer-event-list">
          <div v-for="item in activeRuleDetailRows" :key="item.id" class="drawer-event-item">
            <div class="drawer-event-head">
              <div>
                <strong>{{ item.supplierName }}</strong>
                <p>{{ item.fileName || '未关联文件' }} · {{ formatDateTime(item.at) }}</p>
              </div>
              <el-tag :type="severityMeta(item.severity).type">{{ severityMeta(item.severity).label }}</el-tag>
            </div>
            <p>{{ item.detail }}</p>
            <div class="drawer-event-foot">
              <span v-if="item.linkedTaskNo">关联任务 {{ item.linkedTaskNo }} · {{ item.linkedTaskStatusMeta.label }}</span>
              <span v-else>暂未联动重审</span>
              <div class="toolbar">
                <el-button size="small" plain @click="locateSupplierFromEvent(item)">定位供应商</el-button>
                <el-button
                  v-if="item.recordId"
                  size="small"
                  type="primary"
                  plain
                  @click="triggerRereviewFromEvent(item)"
                >
                  按该命中触发重审
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rich-empty compact-empty">当前规则暂无明细记录。</div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.insight-grid,
.module-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.radar-shell-card {
  padding: 16px 20px;
}

.radar-view-switch {
  display: flex;
  justify-content: flex-start;
  overflow-x: auto;
}

.radar-view-hint {
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.radar-grid {
  grid-template-columns: minmax(340px, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
}

.panel-card,
.action-card {
  padding: 20px;
}

.detail-panel {
  position: sticky;
  top: 0;
}

.panel-title,
.timeline-head,
.drawer-summary-head,
.drawer-event-head,
.rule-summary-head,
.score-breakdown-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.panel-title {
  margin-bottom: 14px;
}

.panel-title h3,
.drawer-summary-head h3 {
  margin: 0 0 6px;
}

.panel-title p,
.drawer-summary-head p {
  margin: 0;
  color: var(--text-muted);
}

.filter-toolbar {
  margin-bottom: 16px;
}

.supplier-list,
.risk-record-list,
.timeline-list,
.linkage-list,
.drawer-event-list,
.scan-grid,
.rule-summary-grid,
.rule-config-grid,
.rule-chip-grid,
.score-breakdown-list {
  display: grid;
  gap: 12px;
}

.supplier-item,
.rule-summary-card,
.rule-chip-card {
  width: 100%;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.supplier-item {
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  transition: 0.2s ease;
}

.supplier-item:hover,
.supplier-item.active,
.rule-summary-card:hover,
.rule-chip-card:hover {
  border-color: rgba(31, 115, 216, 0.35);
  box-shadow: 0 10px 24px rgba(24, 64, 116, 0.08);
  transform: translateY(-1px);
}

.supplier-item-head,
.risk-record-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.supplier-item-head p,
.risk-record-item p,
.timeline-item p,
.linkage-item p,
.drawer-event-item p,
.rule-summary-card p,
.scan-card p,
.rule-config-card p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.supplier-item-metrics,
.rule-summary-metrics,
.drawer-event-foot,
.rule-config-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.trend-summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.trend-summary-item {
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.trend-summary-item span,
.trend-bar-item span,
.trend-bar-item small,
.risk-record-item span,
.timeline-item span,
.timeline-item small,
.linkage-item span,
.rule-chip-card span,
.drawer-event-head p,
.drawer-event-foot span,
.score-breakdown-item small,
.scan-card span {
  color: var(--text-muted);
}

.trend-summary-item strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.trend-bars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 14px;
  align-items: end;
}

.trend-bar-item {
  display: grid;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.trend-bar-shell {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 140px;
  padding: 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(235, 244, 255, 0.92), rgba(246, 250, 255, 0.98));
  border: 1px solid var(--line-soft);
}

.trend-bar-fill {
  width: 100%;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 157, 66, 0.9), rgba(226, 74, 74, 0.92));
}

.scan-card,
.rule-summary-card,
.rule-config-card,
.rule-chip-card,
.risk-record-item,
.timeline-item,
.linkage-item,
.drawer-event-item,
.score-breakdown-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.rule-config-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.mini-field {
  display: grid;
  gap: 6px;
}

.mini-field span,
.switch-row span {
  color: var(--text-muted);
  font-size: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-config-actions {
  margin-top: 14px;
}

.score-breakdown-item {
  display: grid;
  gap: 8px;
}

.compact-supplier-item {
  padding: 12px;
}

.score-breakdown-bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(224, 233, 245, 0.95);
  overflow: hidden;
}

.score-breakdown-fill {
  height: 100%;
  border-radius: 999px;
}

.score-breakdown-fill.danger {
  background: linear-gradient(90deg, rgba(225, 87, 89, 0.9), rgba(193, 54, 59, 0.95));
}

.score-breakdown-fill.warning {
  background: linear-gradient(90deg, rgba(255, 179, 71, 0.9), rgba(226, 142, 36, 0.95));
}

.score-breakdown-fill.info {
  background: linear-gradient(90deg, rgba(87, 144, 255, 0.9), rgba(45, 98, 214, 0.95));
}

.table-entity {
  display: grid;
  gap: 6px;
}

.detail-block + .detail-block {
  margin-top: 16px;
}

.section-subtitle {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.action-card {
  margin-top: 18px;
}

.compact-empty {
  min-height: 120px;
}

.drawer-summary {
  margin-bottom: 20px;
}

.drawer-event-foot {
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 1360px) {
  .insight-grid,
  .module-grid,
  .radar-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }
}

@media (max-width: 920px) {
  .trend-summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .trend-summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
