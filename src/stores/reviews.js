import { defineStore } from 'pinia'
import { MOCK_APPEALS, MOCK_DOCUMENTS, MOCK_NOTIFICATION_LOGS, MOCK_REVIEW_LOGS } from '../constants/mockData'
import { createInlineImage, SAMPLE_PDF_DATA_URI } from '../utils/preview'
import { useStandardsStore } from './standards'
import { useSuppliersStore } from './suppliers'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function dateAfterYears(dateString, years) {
  const base = dateString ? new Date(dateString) : new Date()
  const next = new Date(base)
  next.setFullYear(next.getFullYear() + years)
  return next.toISOString()
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildAppealDeadline(reviewedAt, days = 5) {
  if (!reviewedAt) return ''
  const deadline = new Date(reviewedAt)
  deadline.setDate(deadline.getDate() + days)
  deadline.setHours(23, 59, 59, 0)
  return deadline.toISOString()
}

function severityRank(severity) {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[severity] || 0
}

function sortByUploadedAt(a, b) {
  return new Date(b.uploadedAt) - new Date(a.uploadedAt)
}

function sortBySentAt(a, b) {
  return new Date(b.sentAt) - new Date(a.sentAt)
}

function sortByUpdatedAt(a, b) {
  return new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
}

function isAppealActive(appeal) {
  return ['submitted', 'under_review', 'supplement_required'].includes(appeal?.status)
}

function enrichAppeal(appeal, record) {
  return {
    ...appeal,
    recordStatus: record?.status || '',
    recordCategory: record?.category || '',
    appealableUntil: record?.appealDeadline || '',
    assigneeName: appeal?.assigneeName || '',
    assignedAt: appeal?.assignedAt || '',
  }
}

function appealStatusLabel(status) {
  return {
    submitted: '申诉已提交',
    under_review: '申诉复核中',
    supplement_required: '待补充材料',
    accepted: '申诉成立',
    rejected: '申诉驳回',
    closed: '申诉已结案',
  }[status] || '申诉更新'
}

function createRereviewTaskNo(currentLength) {
  const month = new Date().toISOString().slice(0, 7).replace('-', '')
  return `RR-${month}-${String(currentLength + 1).padStart(4, '0')}`
}

function createHistoryBackfillBatchNo() {
  const month = new Date().toISOString().slice(0, 7).replace('-', '')
  return `HIS-${month}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function isRereviewActive(task) {
  return ['pending', 'in_progress'].includes(task?.status)
}

function buildInitialRereviewTasks() {
  return [
    {
      id: 'rr-001',
      taskNo: 'RR-202604-0001',
      supplierId: 'sup-002',
      supplierName: '筋斗云供应链科技（上海）有限公司',
      recordId: 'doc-004',
      previousRecordId: '',
      category: 'industry-cert',
      triggerSource: 'risk-radar',
      taskType: 'renewal',
      status: 'pending',
      reviewerName: '',
      assignedAt: '',
      reason: '行业强制认证已过期，需补传新证并发起变更重审。',
      comment: '',
      lifecycleStatusBefore: 'watch',
      lifecycleStatusAfter: '',
      createdAt: '2026-04-24T09:30:00',
      updatedAt: '2026-04-24T09:30:00',
      timeline: [
        {
          id: 'rrlog-001',
          action: '系统触发重审',
          actor: '系统巡检',
          at: '2026-04-24T09:30:00',
          note: '检测到行业强制认证已过期，已生成重审任务。',
        },
      ],
    },
    {
      id: 'rr-002',
      taskNo: 'RR-202604-0002',
      supplierId: 'sup-001',
      supplierName: '悟空精工（深圳）有限公司',
      recordId: 'doc-002',
      previousRecordId: '',
      category: 'quality-system',
      triggerSource: 'file-update',
      taskType: 'change',
      status: 'in_progress',
      reviewerName: '采购审核员-金箍',
      assignedAt: '2026-04-25T15:00:00',
      reason: '质量体系证书临期，供应商已更新资料，进入复审中。',
      comment: '已收到最新版扫描件，正在核对认证范围与盖章附件。',
      lifecycleStatusBefore: 'active',
      lifecycleStatusAfter: '',
      createdAt: '2026-04-25T10:20:00',
      updatedAt: '2026-04-25T15:10:00',
      timeline: [
        {
          id: 'rrlog-002',
          action: '供应商更新文件',
          actor: '唐小白',
          at: '2026-04-25T10:20:00',
          note: '供应商提交了新的质量体系证书，系统自动生成复审任务。',
        },
        {
          id: 'rrlog-003',
          action: '开始复审',
          actor: '采购审核员-金箍',
          at: '2026-04-25T15:10:00',
          note: '已开始核对证书有效期与认证范围。',
        },
      ],
    },
  ]
}

function enrichRereviewTask(task, record) {
  return {
    ...task,
    fileName: record?.fileName || '',
    recordStatus: record?.status || '',
    riskStatus: record?.riskStatus || { label: '--', type: 'info' },
    uploadedAt: record?.uploadedAt || '',
  }
}

function enrichRereviewTaskWithRecord(task, documents, notificationLogs) {
  const record = documents.find((item) => item.id === task.recordId)
  return enrichRereviewTask(task, record ? enrichRecord(record, notificationLogs) : undefined)
}

function classifyRenewal(record) {
  if (!record) {
    return {
      needUpdate: false,
      level: 'safe',
      label: '正常',
      daysLeft: null,
      reason: '文件状态正常',
    }
  }

  if (record.status === 'rejected') {
    return {
      needUpdate: true,
      level: 'rejected',
      label: '退回补传',
      daysLeft: null,
      reason: record.adminOpinion || '管理员已退回该文件，请重新上传最新有效文件。',
    }
  }

  const validUntil = record.extractedFields?.validUntil
  if (!validUntil) {
    return {
      needUpdate: false,
      level: 'safe',
      label: '正常',
      daysLeft: null,
      reason: '未识别到有效期字段',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(validUntil)
  expiryDate.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expiryDate - today) / 86400000)

  if (daysLeft < 0) {
    return {
      needUpdate: true,
      level: 'expired',
      label: '已过期',
      daysLeft,
      reason: `文件已过期 ${Math.abs(daysLeft)} 天，请立即更新。`,
    }
  }

  if (daysLeft <= 15) {
    return {
      needUpdate: true,
      level: 'urgent-expiring',
      label: '临期加急',
      daysLeft,
      reason: `距离到期仅剩 ${daysLeft} 天，建议立即补传最新版文件。`,
    }
  }

  if (daysLeft <= 45) {
    return {
      needUpdate: true,
      level: 'expiring',
      label: '即将到期',
      daysLeft,
      reason: `距离到期还有 ${daysLeft} 天，建议提前处理续期。`,
    }
  }

  return {
    needUpdate: false,
    level: 'safe',
    label: '正常',
    daysLeft,
    reason: `距离到期还有 ${daysLeft} 天。`,
  }
}

function includesAny(list, keywords) {
  return list.some((item) => keywords.some((keyword) => String(item).includes(keyword)))
}

function externalCheckStatusMeta(status) {
  return {
    exception: { label: '接口异常待人工确认', type: 'danger' },
    'manual-reviewed': { label: '已人工复核', type: 'success' },
    'auto-passed': { label: '自动核验完成', type: 'success' },
  }[status] || { label: '待确认', type: 'warning' }
}

function externalDecisionMeta(decision) {
  return {
    confirmed: { label: '人工确认通过', type: 'success' },
    'risk-retained': { label: '保留风险结论', type: 'warning' },
    resubmit: { label: '要求补件后重审', type: 'danger' },
  }[decision] || { label: '待处理', type: 'info' }
}

function normalizeExternalChecks(record) {
  return (record?.externalChecks || []).map((item, index) => {
    const normalized = {
      id: item.id || `${record?.id || 'record'}-ext-${index + 1}`,
      serviceCode: item.serviceCode || 'external-service',
      serviceName: item.serviceName || '外部核验服务',
      checkItem: item.checkItem || '外部核验事项',
      materialName: item.materialName || record?.fileName || '--',
      affectedFields: Array.isArray(item.affectedFields) ? item.affectedFields.filter(Boolean) : [],
      affectedMaterials:
        Array.isArray(item.affectedMaterials) && item.affectedMaterials.length
          ? item.affectedMaterials.filter(Boolean)
          : [item.materialName || record?.fileName || '--'],
      status: item.status || 'exception',
      exceptionType: item.exceptionType || 'service-unavailable',
      message: item.message || '外部接口暂未返回核验结果，需要人工复核。',
      fallbackSuggestion: item.fallbackSuggestion || '请结合原始材料、标准比对和供应商文件进行人工判断。',
      manualDecision: item.manualDecision || '',
      manualNote: item.manualNote || '',
      handledAt: item.handledAt || '',
      handledBy: item.handledBy || '',
    }

    return {
      ...normalized,
      statusMeta: externalCheckStatusMeta(normalized.status),
      decisionMeta: externalDecisionMeta(normalized.manualDecision),
      pendingManual: normalized.status === 'exception' && !normalized.manualDecision,
    }
  })
}

function buildExternalCheckSummary(externalChecks) {
  return {
    total: externalChecks.length,
    pending: externalChecks.filter((item) => item.pendingManual).length,
    completed: externalChecks.filter((item) => Boolean(item.manualDecision)).length,
  }
}

function buildManualReviewBrief(externalChecks) {
  return externalChecks.map((item) => ({
    id: item.id,
    serviceName: item.serviceName,
    checkItem: item.checkItem,
    pendingManual: item.pendingManual,
    resultLabel: item.pendingManual ? '待人工确认' : externalDecisionMeta(item.manualDecision).label,
    note:
      item.manualNote ||
      item.message ||
      '外部接口异常未完成自动核验，请结合原始材料继续人工确认。',
    handledAt: item.handledAt || '',
    handledBy: item.handledBy || '',
  }))
}

function buildRiskAlerts(record, renewalState = classifyRenewal(record)) {
  const alerts = []
  const riskFlags = record?.riskFlags || []
  const externalChecks = record?.externalChecks || []
  const externalSummary = record?.externalCheckSummary || buildExternalCheckSummary(normalizeExternalChecks(record))

  if (renewalState.level === 'expired') {
    alerts.push({
      code: 'expired',
      label: '证书已过期',
      severity: 'critical',
      description: renewalState.reason,
    })
  }

  if (renewalState.level === 'urgent-expiring') {
    alerts.push({
      code: 'urgent-expiring',
      label: '证书临期加急',
      severity: 'high',
      description: renewalState.reason,
    })
  }

  if (renewalState.level === 'expiring') {
    alerts.push({
      code: 'expiring',
      label: '证书临期',
      severity: 'medium',
      description: renewalState.reason,
    })
  }

  if (renewalState.level === 'rejected') {
    alerts.push({
      code: 'reupload',
      label: '退回补传',
      severity: 'high',
      description: renewalState.reason,
    })
  }

  if (includesAny(riskFlags, ['企业名称', '统一社会信用代码', '法人'])) {
    alerts.push({
      code: 'field-mismatch',
      label: '主体信息不一致',
      severity: 'high',
      description: '识别字段与供应商主数据不一致，需要尽快核对并补传。',
    })
  }

  if (includesAny(riskFlags, ['认证范围'])) {
    alerts.push({
      code: 'scope-pending',
      label: '认证范围待核实',
      severity: 'medium',
      description: '认证范围与准入要求存在差异，需要管理员人工复核。',
    })
  }

  if (includesAny(riskFlags, ['一票否决', '技术能力不满足'])) {
    alerts.push({
      code: 'veto',
      label: '触发一票否决',
      severity: 'critical',
      description: '文件命中关键否决项，当前文件不可直接准入。',
    })
  }

  if ((record?.sameSourceMatches || []).length) {
    alerts.push({
      code: 'same-source',
      label: '同源主体命中',
      severity: 'medium',
      description: `命中 ${(record.sameSourceMatches || []).length} 条关联主体线索，需要管理员复核。`,
    })
  }

  if (externalSummary.pending) {
    alerts.push({
      code: 'external-exception',
      label: '外部调用异常',
      severity: externalSummary.pending > 1 ? 'high' : 'medium',
      description: `共有 ${externalSummary.pending} 项外部核验未正常返回结果，需采购/审核员人工确认。`,
    })
  }

  if (record?.status === 'pending' && (record?.machineStatus === 'warning' || externalChecks.length)) {
    alerts.push({
      code: 'manual-review',
      label: '待人工复核',
      severity: 'low',
      description: '机器预审发现疑点，正在等待管理员确认。',
    })
  }

  if (!alerts.length && record?.machineStatus === 'fail') {
    alerts.push({
      code: 'precheck-fail',
      label: '机器预警',
      severity: 'high',
      description: '机器预审已发现明显风险，请优先处理。',
    })
  }

  const seen = new Set()
  return alerts.filter((item) => {
    if (seen.has(item.code)) return false
    seen.add(item.code)
    return true
  })
}

function resolveRiskStatus(alerts) {
  if (!alerts.length) {
    return { code: 'normal', label: '正常归档', type: 'success', rank: 0 }
  }

  if (alerts.some((item) => item.severity === 'critical')) {
    return { code: 'critical', label: '紧急处理', type: 'danger', rank: 4 }
  }

  if (alerts.some((item) => item.severity === 'high')) {
    return { code: 'high', label: '高风险待处理', type: 'danger', rank: 3 }
  }

  if (alerts.some((item) => item.severity === 'medium')) {
    return { code: 'medium', label: '重点关注', type: 'warning', rank: 2 }
  }

  return { code: 'low', label: '跟进观察', type: 'info', rank: 1 }
}

function resolveNotificationState(record, notificationLogs) {
  const relatedLogs = notificationLogs
    .filter((item) => item.recordId === record.id)
    .slice()
    .sort(sortBySentAt)

  if (!relatedLogs.length) {
    return {
      code: 'unsent',
      label: '未通知',
      type: 'info',
      count: 0,
      lastSentAt: '',
      lastMode: '',
    }
  }

  const latest = relatedLogs[0]
  return {
    code: latest.mode === 'manual' ? 'manual-sent' : 'auto-sent',
    label: latest.mode === 'manual' ? '已人工通知' : '已自动通知',
    type: latest.mode === 'manual' ? 'success' : 'warning',
    count: relatedLogs.length,
    lastSentAt: latest.sentAt,
    lastMode: latest.mode,
  }
}

function enrichRecord(record, notificationLogs) {
  const renewalState = classifyRenewal(record)
  const externalChecks = normalizeExternalChecks(record)
  const externalCheckSummary = buildExternalCheckSummary(externalChecks)
  const machineStatus =
    record.machineStatus === 'fail' ? 'fail' : externalCheckSummary.pending ? 'exception' : record.machineStatus
  const riskAlerts = buildRiskAlerts({ ...record, machineStatus, externalChecks, externalCheckSummary }, renewalState)
  const riskStatus = resolveRiskStatus(riskAlerts)

  return {
    ...record,
    machineStatus,
    renewalState,
    riskAlerts,
    riskStatus,
    externalChecks,
    externalCheckSummary,
    manualReviewBrief: buildManualReviewBrief(externalChecks),
    notificationState: resolveNotificationState(record, notificationLogs),
    uploadSource: record.uploadSource || 'supplier',
    uploadedByRole: record.uploadedByRole || (record.uploadSource === 'admin' ? 'admin' : 'supplier'),
    uploadedByName: record.uploadedByName || '',
  }
}

export const useReviewsStore = defineStore('reviews', {
  state: () => ({
    documents: clone(MOCK_DOCUMENTS),
    reviewLogs: clone(MOCK_REVIEW_LOGS),
    notificationLogs: clone(MOCK_NOTIFICATION_LOGS),
    appeals: clone(MOCK_APPEALS),
    rereviewTasks: buildInitialRereviewTasks(),
  }),
  getters: {
    enrichedDocuments: (state) =>
      state.documents
        .map((item) => enrichRecord(item, state.notificationLogs))
        .sort(sortByUploadedAt),
    recordsBySupplier: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichRecord(item, state.notificationLogs))
        .sort(sortByUploadedAt),
    pendingRecords: (state) =>
      state.documents
        .filter((item) => item.status === 'pending')
        .map((item) => enrichRecord(item, state.notificationLogs))
        .sort(sortByUploadedAt),
    riskRecords: (state) =>
      state.documents
        .map((item) => enrichRecord(item, state.notificationLogs))
        .filter((item) => item.riskStatus.code !== 'normal')
        .sort((a, b) => b.riskStatus.rank - a.riskStatus.rank || sortByUploadedAt(a, b)),
    riskRecordsBySupplier: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichRecord(item, state.notificationLogs))
        .filter((item) => item.riskStatus.code !== 'normal')
        .sort((a, b) => b.riskStatus.rank - a.riskStatus.rank || sortByUploadedAt(a, b)),
    getRecord: (state) => (recordId) => {
      const record = state.documents.find((item) => item.id === recordId)
      return record ? enrichRecord(record, state.notificationLogs) : undefined
    },
    renewalRecords: (state) =>
      state.documents
        .map((item) => enrichRecord(item, state.notificationLogs))
        .filter((item) => item.renewalState.needUpdate)
        .sort((a, b) => b.riskStatus.rank - a.riskStatus.rank || sortByUploadedAt(a, b)),
    renewalRecordsBySupplier: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichRecord(item, state.notificationLogs))
        .filter((item) => item.renewalState.needUpdate)
        .sort((a, b) => b.riskStatus.rank - a.riskStatus.rank || sortByUploadedAt(a, b)),
    supplierArchive: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichRecord(item, state.notificationLogs))
        .sort(sortByUploadedAt),
    notificationsByRecord: (state) => (recordId) =>
      state.notificationLogs.filter((item) => item.recordId === recordId).slice().sort(sortBySentAt),
    notificationsBySupplier: (state) => (supplierId) =>
      state.notificationLogs.filter((item) => item.supplierId === supplierId).slice().sort(sortBySentAt),
    latestNotificationByRecord: (state) => (recordId) =>
      state.notificationLogs.filter((item) => item.recordId === recordId).slice().sort(sortBySentAt)[0],
    allAppeals: (state) =>
      state.appeals
        .map((item) => enrichAppeal(item, state.documents.find((record) => record.id === item.recordId)))
        .sort(sortByUpdatedAt),
    activeAppealCount: (state) =>
      state.appeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length,
    appealsBySupplier: (state) => (supplierId) =>
      state.appeals
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichAppeal(item, state.documents.find((record) => record.id === item.recordId)))
        .sort(sortByUpdatedAt),
    getAppeal: (state) => (appealId) => {
      const appeal = state.appeals.find((item) => item.id === appealId)
      if (!appeal) return undefined
      return enrichAppeal(appeal, state.documents.find((record) => record.id === appeal.recordId))
    },
    latestAppealByRecord: (state) => (recordId) => {
      const appeal = state.appeals.filter((item) => item.recordId === recordId).slice().sort(sortByUpdatedAt)[0]
      if (!appeal) return undefined
      return enrichAppeal(appeal, state.documents.find((record) => record.id === recordId))
    },
    allRereviewTasks: (state) =>
      state.rereviewTasks
        .map((item) => enrichRereviewTaskWithRecord(item, state.documents, state.notificationLogs))
        .sort(sortByUpdatedAt),
    activeRereviewCount: (state) => state.rereviewTasks.filter((item) => isRereviewActive(item)).length,
    rereviewTasksBySupplier: (state) => (supplierId) =>
      state.rereviewTasks
        .filter((item) => item.supplierId === supplierId)
        .map((item) => enrichRereviewTaskWithRecord(item, state.documents, state.notificationLogs))
        .sort(sortByUpdatedAt),
    latestRereviewByRecord: (state) => (recordId) => {
      const task = state.rereviewTasks.filter((item) => item.recordId === recordId).slice().sort(sortByUpdatedAt)[0]
      if (!task) return undefined
      return enrichRereviewTaskWithRecord(task, state.documents, state.notificationLogs)
    },
  },
  actions: {
    createRereviewTask({
      supplierId,
      recordId,
      previousRecordId = '',
      category = '',
      triggerSource = 'manual',
      taskType = 'change',
      reason = '',
      operatorName = '系统',
      syncLifecycle = true,
    }) {
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到对应供应商，无法创建重审任务。')
      }

      const record = this.documents.find((item) => item.id === recordId)
      const resolvedCategory = category || record?.category || ''
      const existing = this.rereviewTasks.find(
        (item) =>
          isRereviewActive(item) &&
          item.supplierId === supplierId &&
          (item.recordId === recordId || (resolvedCategory && item.category === resolvedCategory)),
      )
      if (existing) {
        return existing
      }

      if (syncLifecycle) {
        suppliersStore.triggerSupplierRereview(supplierId, {
          operatorName,
          reason: reason || '因资料更新或风险巡检触发变更重审',
        })
      }

      const now = new Date().toISOString()
      const task = {
        id: createId('rr'),
        taskNo: createRereviewTaskNo(this.rereviewTasks.length),
        supplierId,
        supplierName: supplier.enterprise.enterpriseName,
        recordId,
        previousRecordId,
        category: resolvedCategory,
        triggerSource,
        taskType,
        status: 'pending',
        reviewerName: '',
        assignedAt: '',
        reason: reason || '已触发重审',
        comment: '',
        lifecycleStatusBefore: supplier.lifecycle.status,
        lifecycleStatusAfter: '',
        createdAt: now,
        updatedAt: now,
        timeline: [
          {
            id: createId('rrlog'),
            action: '创建重审任务',
            actor: operatorName,
            at: now,
            note: reason || '已生成重审任务，等待管理员处理。',
          },
        ],
      }

      this.rereviewTasks.unshift(task)
      return task
    },
    assignRereviewTasks({ taskIds, assigneeName, operatorName = '管理员', startReview = false, comment = '' }) {
      const normalizedAssignee = String(assigneeName || '').trim()
      if (!normalizedAssignee) {
        throw new Error('请先选择复审人。')
      }

      const selectedIds = Array.isArray(taskIds) ? taskIds.filter(Boolean) : []
      if (!selectedIds.length) {
        throw new Error('请至少选择一条重审任务。')
      }

      const tasks = this.rereviewTasks.filter((item) => selectedIds.includes(item.id))
      if (!tasks.length) {
        throw new Error('未找到可操作的重审任务。')
      }

      const now = new Date().toISOString()

      return tasks.map((task) => {
        task.reviewerName = normalizedAssignee
        task.assignedAt = now
        task.updatedAt = now
        task.timeline.unshift({
          id: createId('rrlog'),
          action: '指派复审人',
          actor: operatorName,
          at: now,
          note: `已指派给 ${normalizedAssignee}${startReview ? '，并进入复审。' : '。'}`,
        })

        if (startReview && task.status === 'pending') {
          return this.processRereviewTask({
            taskId: task.id,
            reviewerName: normalizedAssignee,
            nextStatus: 'in_progress',
            comment: comment || `已指派给 ${normalizedAssignee}，开始复审。`,
          })
        }

        return task
      })
    },
    processRereviewTask({
      taskId,
      reviewerName,
      nextStatus,
      comment = '',
      resultingRecordStatus = '',
      lifecycleStatus = '',
      unmetClauses = [],
      improvementSuggestions = [],
    }) {
      const task = this.rereviewTasks.find((item) => item.id === taskId)
      if (!task) {
        throw new Error('未找到对应重审任务。')
      }

      const now = new Date().toISOString()
      task.status = nextStatus
      task.reviewerName = reviewerName || task.reviewerName
      task.comment = comment
      task.updatedAt = now

      const record = this.documents.find((item) => item.id === task.recordId)
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(task.supplierId)
      const normalizedClauses = normalizeTextList(unmetClauses)
      const normalizedSuggestions = normalizeTextList(improvementSuggestions)

      if (nextStatus === 'in_progress') {
        task.timeline.unshift({
          id: createId('rrlog'),
          action: '开始复审',
          actor: reviewerName,
          at: now,
          note: comment || '已开始处理该重审任务。',
        })
        return task
      }

      if (record && ['approved', 'rejected'].includes(nextStatus)) {
        const finalRecordStatus =
          resultingRecordStatus ||
          (nextStatus === 'approved' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : record.status)

        record.status = finalRecordStatus
        record.reviewerName = reviewerName
        record.reviewedAt = now
        record.adminOpinion = comment
        record.unmetClauses = finalRecordStatus === 'approved' ? [] : normalizedClauses
        record.improvementSuggestions = finalRecordStatus === 'approved' ? [] : normalizedSuggestions
        record.appealable = finalRecordStatus === 'approved' ? false : true
        record.appealDeadline = finalRecordStatus === 'approved' ? '' : buildAppealDeadline(now)

        this.reviewLogs.unshift({
          id: createId('log'),
          recordId: record.id,
          taskNo: record.taskNo,
          supplierName: supplier?.enterprise.enterpriseName || task.supplierName,
          fileName: record.fileName,
          reviewer: reviewerName,
          action:
            finalRecordStatus === 'approved'
              ? '重审通过'
              : finalRecordStatus === 'conditional'
                ? '重审有条件通过'
                : '重审未通过',
          result:
            finalRecordStatus === 'approved' ? '已通过' : finalRecordStatus === 'conditional' ? '有条件通过' : '未通过',
          score: record.scoreBreakdown?.total || record.precheckScore || 0,
          comment,
          reviewedAt: now,
        })

        if (finalRecordStatus === 'conditional' || finalRecordStatus === 'rejected') {
          this.sendRiskNotification({
            recordId: record.id,
            operatorName: reviewerName,
            trigger: 'rereview-auto',
            mode: 'auto',
          })
        }
      }

      const finalLifecycleStatus =
        lifecycleStatus ||
        (nextStatus === 'approved'
          ? 'active'
          : nextStatus === 'rejected'
            ? 'frozen'
            : supplier?.lifecycle.status || 'watch')
      task.lifecycleStatusAfter = finalLifecycleStatus

      if (supplier) {
        suppliersStore.updateLifecycleStatus(task.supplierId, {
          status: finalLifecycleStatus,
          reason:
            comment ||
            (nextStatus === 'approved'
              ? '重审通过，供应商恢复正常状态。'
              : nextStatus === 'rejected'
                ? '重审未通过，维持风险限制。'
                : '重审任务已关闭。'),
          operatorName: reviewerName,
          source: 'rereview-workbench',
        })
      }

      task.timeline.unshift({
        id: createId('rrlog'),
        action: nextStatus === 'approved' ? '重审通过' : nextStatus === 'rejected' ? '重审未通过' : '重审关闭',
        actor: reviewerName,
        at: now,
        note: comment || '已完成重审处理。',
      })

      return task
    },
    batchProcessRereviewTasks({
      taskIds,
      operatorName,
      nextStatus,
      comment = '',
      resultingRecordStatus = '',
      lifecycleStatus = '',
      unmetClauses = [],
      improvementSuggestions = [],
    }) {
      const selectedIds = Array.isArray(taskIds) ? taskIds.filter(Boolean) : []
      if (!selectedIds.length) {
        throw new Error('请至少选择一条重审任务。')
      }

      const tasks = this.rereviewTasks.filter((item) => selectedIds.includes(item.id))
      if (!tasks.length) {
        throw new Error('未找到可批量处理的重审任务。')
      }

      return tasks.map((task) =>
        this.processRereviewTask({
          taskId: task.id,
          reviewerName: task.reviewerName || operatorName,
          nextStatus,
          comment,
          resultingRecordStatus:
            nextStatus === 'closed'
              ? ''
              : nextStatus === 'rejected'
                ? 'rejected'
                : resultingRecordStatus || 'approved',
          lifecycleStatus,
          unmetClauses,
          improvementSuggestions,
        }),
      )
    },
    getRenewalState(record) {
      return classifyRenewal(record)
    },
    canSubmitAppeal(recordId) {
      const record = this.getRecord(recordId)
      if (!record?.appealable) {
        return { ok: false, message: '当前记录不可申诉。' }
      }

      if (record.appealDeadline && new Date(record.appealDeadline) < new Date()) {
        return { ok: false, message: '当前记录已超过申诉截止时间。' }
      }

      const latestAppeal = this.latestAppealByRecord(recordId)
      if (latestAppeal && isAppealActive(latestAppeal)) {
        return { ok: false, message: '当前记录已有进行中的申诉，请先查看处理状态。', appeal: latestAppeal }
      }

      return { ok: true }
    },
    getRiskProfile(record) {
      const renewalState = classifyRenewal(record)
      const alerts = buildRiskAlerts(record, renewalState)
      return {
        alerts,
        renewalState,
        status: resolveRiskStatus(alerts),
      }
    },
    createTaskNo() {
      const month = new Date().toISOString().slice(0, 7).replace('-', '')
      return `WK-${month}-${String(this.documents.length + 1).padStart(4, '0')}`
    },
    backfillHistoricalReviews({
      supplierId,
      items = [],
      operatorName = '管理员',
      sourceFileName = '',
      note = '',
      parseRuleName = '',
      parseConfigSummary = [],
      sourceFileMeta = null,
      failureDetails = [],
    }) {
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到对应供应商，无法回填历史审核记录。')
      }

      if (!items.length) {
        throw new Error('请至少提供一条历史审核记录后再回填。')
      }

      const batchNo = createHistoryBackfillBatchNo()
      const createdRecords = []

      items.forEach((item, index) => {
        const reviewedAt = item.reviewedAt || new Date().toISOString()
        const uploadedAt = item.uploadedAt || new Date(new Date(reviewedAt).getTime() - 24 * 60 * 60 * 1000).toISOString()
        const scoreTotal = Number(item.scoreTotal ?? item.precheckScore ?? 88)
        const normalizedClauses = normalizeTextList(item.unmetClauses)
        const normalizedSuggestions = normalizeTextList(item.improvementSuggestions)
        const status = item.status || 'approved'
        const machineStatus = status === 'approved' ? 'pass' : status === 'conditional' ? 'warning' : 'fail'
        const riskFlags =
          status === 'approved'
            ? []
            : normalizedClauses.length
              ? normalizedClauses.map((clause) => `历史回填：${clause}`)
              : ['历史回填记录存在未满足项']

        const record = {
          id: createId('doc'),
          taskNo: this.createTaskNo(),
          supplierId,
          fileName: item.fileName,
          category: item.category,
          mimeType: item.mimeType || 'application/pdf',
          sizeMB: item.sizeMB || 1.8,
          uploadedAt,
          status,
          machineStatus,
          previewUrl: item.previewUrl || SAMPLE_PDF_DATA_URI,
          standardTemplateId: supplier.enterprise.templateId,
          extractedFields: {
            enterpriseName: supplier.enterprise.enterpriseName,
            creditCode: supplier.enterprise.creditCode,
            legalPerson: supplier.enterprise.legalPerson,
            validUntil: item.validUntil || '',
            certificationScope: item.certificationScope || item.fileName || '',
          },
          comparisons: [
            { field: '企业名称', expected: supplier.enterprise.enterpriseName, actual: supplier.enterprise.enterpriseName, result: '匹配' },
            { field: '统一社会信用代码', expected: supplier.enterprise.creditCode, actual: supplier.enterprise.creditCode, result: '匹配' },
            {
              field: '审核结论',
              expected: status === 'approved' ? '通过' : status === 'conditional' ? '有条件通过' : '未通过',
              actual: status === 'approved' ? '通过' : status === 'conditional' ? '有条件通过' : '未通过',
              result: '匹配',
            },
            { field: '证书有效期', expected: item.validUntil || '--', actual: item.validUntil || '--', result: '匹配' },
          ],
          riskFlags,
          precheckScore: scoreTotal,
          scoreBreakdown: item.scoreBreakdown || {
            quality: scoreTotal,
            technical: scoreTotal,
            business: scoreTotal,
            bonus: 0,
            total: scoreTotal,
          },
          sameSourceMatches: [],
          adminOpinion: item.opinion || '',
          unmetClauses: status === 'approved' ? [] : normalizedClauses,
          improvementSuggestions: status === 'approved' ? [] : normalizedSuggestions,
          appealable: false,
          appealDeadline: '',
          reviewerName: item.reviewerName || '历史回填',
          reviewedAt,
          reuploadOf: '',
          nextReviewAt: item.nextReviewAt || dateAfterYears(item.validUntil || reviewedAt, 1),
          uploadSource: 'archive',
          uploadedByRole: 'admin',
          uploadedByName: operatorName,
          isHistoricalBackfill: true,
          historyBatchNo: batchNo,
          historyPeriod: item.historyPeriod || item.period || `历史记录-${index + 1}`,
        }

        this.documents.unshift(record)

        this.reviewLogs.unshift({
          id: createId('log'),
          recordId: record.id,
          taskNo: record.taskNo,
          supplierName: supplier.enterprise.enterpriseName,
          fileName: record.fileName,
          reviewer: record.reviewerName,
          action: '历史审核记录回填',
          result: status === 'approved' ? '已通过' : status === 'conditional' ? '有条件通过' : '未通过',
          score: scoreTotal,
          comment: item.opinion || note || `通过批次 ${batchNo} 回填历史审核记录`,
          reviewedAt,
        })

        createdRecords.push(record)
      })

      const batch = suppliersStore.recordArchiveBackfillBatch({
        supplierId,
        operatorName,
        sourceFileName,
        note: note || `已回填 ${createdRecords.length} 条历史审核记录`,
        parseRuleName,
        parseConfigSummary,
        sourceFileMeta,
        failureDetails,
        batchNo,
        items: createdRecords.map((item) => ({
          recordId: item.id,
          fileName: item.fileName,
          category: item.category,
          status: item.status,
        })),
      })

      return {
        batch,
        records: createdRecords.map((item) => this.getRecord(item.id)),
      }
    },    createAppealNotificationMessage(appeal, record, status, feedback = '') {
      const statusText = appealStatusLabel(status)
      const suffix = feedback ? `处理意见：${feedback}` : '请进入申诉记录页查看最新进展。'
      return `【悟空资质助手】贵司文件《${record.fileName}》的申诉状态已更新为“${statusText}”。${suffix}`
    },
    sendAppealNotification({ appealId, operatorName = '系统', status, feedback = '', trigger = 'appeal-update' }) {
      const appeal = this.appeals.find((item) => item.id === appealId)
      if (!appeal) {
        throw new Error('未找到对应申诉记录。')
      }

      const record = this.documents.find((item) => item.id === appeal.recordId)
      if (!record) {
        throw new Error('未找到申诉关联文件。')
      }

      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(appeal.supplierId)
      if (!supplier?.enterprise?.contactPhone) {
        throw new Error('当前供应商未维护手机号，无法发送申诉进展提醒。')
      }

      const log = {
        id: createId('msg'),
        recordId: record.id,
        supplierId: supplier.id,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        phone: supplier.enterprise.contactPhone,
        channel: 'sms',
        mode: 'auto',
        trigger,
        operatorName,
        riskLabel: '申诉进展',
        alertLabels: [appealStatusLabel(status)],
        message: this.createAppealNotificationMessage(appeal, record, status, feedback),
        status: 'sent',
        sentAt: new Date().toISOString(),
      }

      this.notificationLogs.unshift(log)
      return log
    },
    submitAppeal({
      recordId,
      supplierId,
      reasonType,
      title,
      summary,
      description,
      requestedOutcome,
      contactPhone,
      evidenceNotes = '',
      files = [],
    }) {
      const eligibility = this.canSubmitAppeal(recordId)
      if (!eligibility.ok) {
        throw new Error(eligibility.message)
      }

      const record = this.getRecord(recordId)
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(supplierId)
      if (!record || !supplier || record.supplierId !== supplierId) {
        throw new Error('未找到对应的申诉记录或供应商信息。')
      }

      const normalizedTitle = String(title || '').trim()
      const normalizedSummary = String(summary || '').trim()
      const normalizedDescription = String(description || '').trim()
      const normalizedOutcome = String(requestedOutcome || '').trim()

      if (!normalizedTitle || !normalizedSummary || !normalizedDescription || !normalizedOutcome) {
        throw new Error('请完整填写申诉标题、摘要、详细说明和期望结果。')
      }

      if (!files.length) {
        throw new Error('请至少上传一份申诉材料后再提交。')
      }

      const now = new Date().toISOString()
      const appeal = {
        id: createId('apl'),
        recordId,
        supplierId,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        status: 'submitted',
        reasonType,
        title: normalizedTitle,
        summary: normalizedSummary,
        description: normalizedDescription,
        requestedOutcome: normalizedOutcome,
        contactPhone: String(contactPhone || supplier.enterprise.contactPhone || '').trim(),
        evidenceNotes: String(evidenceNotes || '').trim(),
        assigneeName: '',
        assignedAt: '',
        attachments: files.map((file, index) => ({
          id: `${createId('apl-file')}-${index}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          sizeMB: Number(((file.size || 0) / 1024 / 1024).toFixed(2)),
        })),
        submittedAt: now,
        updatedAt: now,
        latestFeedback: '申诉已提交，等待管理员受理。',
        timeline: [
          {
            id: createId('apl-log'),
            at: now,
            actor: '供应商',
            action: '提交申诉',
            note: normalizedSummary,
          },
        ],
      }

      this.appeals.unshift(appeal)
      this.reviewLogs.unshift({
        id: createId('log'),
        recordId: record.id,
        taskNo: record.taskNo,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        reviewer: supplier.enterprise.contactName || supplier.enterprise.enterpriseName,
        action: '提交申诉',
        result: appealStatusLabel('submitted'),
        score: record.scoreBreakdown?.total || record.precheckScore || 0,
        comment: normalizedSummary,
        reviewedAt: now,
      })
      return this.getAppeal(appeal.id)
    },
    assignAppeals({ appealIds, assigneeName, operatorName = '管理员', startReview = false }) {
      const normalizedAssignee = String(assigneeName || '').trim()
      if (!normalizedAssignee) {
        throw new Error('请先选择或填写复核人。')
      }

      if (!appealIds?.length) {
        throw new Error('请至少选择一条申诉后再进行指派。')
      }

      const now = new Date().toISOString()

      appealIds.forEach((appealId) => {
        const appeal = this.appeals.find((item) => item.id === appealId)
        if (!appeal) return

        appeal.assigneeName = normalizedAssignee
        appeal.assignedAt = now
        appeal.updatedAt = now
        appeal.latestFeedback = `已指派给 ${normalizedAssignee} 进行复核。`
        appeal.timeline.push({
          id: createId('apl-log'),
          at: now,
          actor: operatorName,
          action: '指派复核人',
          note: `已指派给 ${normalizedAssignee}${startReview ? '，并同步进入复核中。' : '。'}`,
        })

        const record = this.documents.find((item) => item.id === appeal.recordId)
        this.reviewLogs.unshift({
          id: createId('log'),
          recordId: appeal.recordId,
          taskNo: record?.taskNo || '--',
          supplierName: appeal.supplierName,
          fileName: appeal.fileName,
          reviewer: operatorName,
          action: '申诉处理-指派复核人',
          result: `已指派 ${normalizedAssignee}`,
          score: record?.scoreBreakdown?.total || record?.precheckScore || 0,
          comment: `已指派给 ${normalizedAssignee}${startReview ? '，并同步进入复核中。' : '。'}`,
          reviewedAt: now,
        })

        if (startReview && appeal.status === 'submitted') {
          appeal.status = 'under_review'
          appeal.timeline.push({
            id: createId('apl-log'),
            at: now,
            actor: normalizedAssignee,
            action: '开始复核',
            note: '管理员批量指派后自动进入复核中。',
          })
        }
      })

      return appealIds.map((id) => this.getAppeal(id)).filter(Boolean)
    },
    batchProcessAppeals({ appealIds, operatorName, nextStatus, feedback }) {
      if (!appealIds?.length) {
        throw new Error('请至少选择一条申诉后再执行批量处理。')
      }

      if (nextStatus === 'accepted') {
        throw new Error('“申诉成立”涉及逐条调整审核结论，请在详情区单独处理。')
      }

      return appealIds.map((appealId) =>
        this.processAppeal({
          appealId,
          operatorName,
          nextStatus,
          feedback,
        }),
      )
    },
    processAppeal({
      appealId,
      operatorName,
      nextStatus,
      feedback,
      resultingRecordStatus = '',
      resultingOpinion = '',
      resultingClauses = [],
      resultingSuggestions = [],
    }) {
      const appeal = this.appeals.find((item) => item.id === appealId)
      if (!appeal) {
        throw new Error('未找到对应申诉记录。')
      }

      const record = this.documents.find((item) => item.id === appeal.recordId)
      if (!record) {
        throw new Error('未找到申诉关联的审核记录。')
      }

      const normalizedFeedback = String(feedback || '').trim()
      if (!normalizedFeedback) {
        throw new Error('请填写本次申诉处理意见。')
      }

      if (nextStatus === 'accepted' && !resultingRecordStatus) {
        throw new Error('申诉成立时请选择调整后的审核结论。')
      }

      const now = new Date().toISOString()
      const actionLabel =
        {
          submitted: '重新提交申诉',
          under_review: '开始复核',
          supplement_required: '要求补充材料',
          accepted: '申诉成立',
          rejected: '申诉驳回',
          closed: '申诉结案',
        }[nextStatus] || '处理申诉'

      appeal.status = nextStatus
      appeal.latestFeedback = normalizedFeedback
      appeal.updatedAt = now
      appeal.timeline.push({
        id: createId('apl-log'),
        at: now,
        actor: operatorName || '管理员',
        action: actionLabel,
        note: normalizedFeedback,
      })

      let processResultLabel = appealStatusLabel(nextStatus)

      if (nextStatus === 'accepted') {
        record.status = resultingRecordStatus
        record.reviewedAt = now
        record.reviewerName = operatorName
        record.adminOpinion = String(resultingOpinion || normalizedFeedback || '').trim()
        record.unmetClauses =
          resultingRecordStatus === 'approved' ? [] : normalizeTextList(resultingClauses || record.unmetClauses)
        record.improvementSuggestions =
          resultingRecordStatus === 'approved'
            ? []
            : normalizeTextList(resultingSuggestions || record.improvementSuggestions)
        record.appealable = false
        record.appealDeadline = ''
        processResultLabel =
          resultingRecordStatus === 'approved'
            ? '申诉成立-调整通过'
            : resultingRecordStatus === 'conditional'
              ? '申诉成立-调整为有条件通过'
              : '申诉成立-维持未通过'
      }

      if (nextStatus === 'rejected' || nextStatus === 'closed') {
        record.appealable = false
        record.appealDeadline = ''
      }

      this.reviewLogs.unshift({
        id: createId('log'),
        recordId: record.id,
        taskNo: record.taskNo,
        supplierName: appeal.supplierName,
        fileName: record.fileName,
        reviewer: operatorName,
        action: `申诉处理-${actionLabel}`,
        result: processResultLabel,
        score: record.scoreBreakdown?.total || record.precheckScore || 0,
        comment: normalizedFeedback,
        reviewedAt: now,
      })

      this.sendAppealNotification({
        appealId: appeal.id,
        operatorName: operatorName || '系统',
        status: nextStatus,
        feedback: normalizedFeedback,
        trigger: 'appeal-auto',
      })

      return this.getAppeal(appeal.id)
    },
    resolveSameSourceMatches(supplier) {
      const suppliersStore = useSuppliersStore()
      return suppliersStore.suppliers
        .filter((item) => item.id !== supplier.id)
        .flatMap((otherSupplier) =>
          supplier.relatedParties
            .filter((party) =>
              otherSupplier.relatedParties.some(
                (otherParty) => otherParty.name === party.name || (party.idNo && otherParty.idNo === party.idNo),
              ),
            )
            .map((party) => ({
              matchedCompany: otherSupplier.enterprise.enterpriseName,
              person: party.name,
              relation: party.relation,
              riskLevel: '中',
            })),
        )
    },
    buildMachineResult({ supplier, category, fileName, mimeType, previewUrl }) {
      const standardsStore = useStandardsStore()
      const template = standardsStore.findTemplateById(supplier.enterprise.templateId)
      const lowerFileName = String(fileName || '').toLowerCase()
      const isMismatch = lowerFileName.includes('不一致') || lowerFileName.includes('mismatch')
      const isExpired = lowerFileName.includes('过期') || lowerFileName.includes('expired')
      const lacksTech = lowerFileName.includes('技术不足')
      const needsConfirm = lowerFileName.includes('待确认') || category === 'quality-system'
      const closeToExpire = category === 'quality-system' || lowerFileName.includes('临期')
      const validUntil = isExpired ? '2025-03-31' : closeToExpire ? '2026-05-20' : '2029-12-31'
      const currentName = isMismatch ? `${supplier.enterprise.enterpriseName}-旧档` : supplier.enterprise.enterpriseName
      const currentLegalPerson = lowerFileName.includes('法人变更')
        ? `${supplier.enterprise.legalPerson}（待更新）`
        : supplier.enterprise.legalPerson

      const fieldNames = standardsStore.fieldLibrary[category] || standardsStore.fieldLibrary.other
      const expectedScope =
        category === 'patent-cert'
          ? '需与技术申报一致'
          : category === 'business-license'
            ? '企业主体经营资格'
            : '应覆盖机加工件制造'
      const actualScope =
        category === 'quality-system'
          ? '机加工件质量管理体系'
          : category === 'patent-cert'
            ? '配套件结构优化专利'
            : '企业主体经营资格'

      const comparisons = fieldNames.map((field) => {
        if (field === '企业名称') {
          return {
            field,
            expected: supplier.enterprise.enterpriseName,
            actual: currentName,
            result: currentName === supplier.enterprise.enterpriseName ? '匹配' : '不匹配',
          }
        }
        if (field === '统一社会信用代码') {
          return {
            field,
            expected: supplier.enterprise.creditCode,
            actual: supplier.enterprise.creditCode,
            result: '匹配',
          }
        }
        if (field === '法人') {
          return {
            field,
            expected: supplier.enterprise.legalPerson,
            actual: currentLegalPerson,
            result: currentLegalPerson === supplier.enterprise.legalPerson ? '匹配' : '不匹配',
          }
        }
        if (field === '认证范围' || field === '专利名称') {
          return {
            field,
            expected: expectedScope,
            actual: actualScope,
            result: needsConfirm ? '待确认' : '匹配',
          }
        }
        return {
          field,
          expected: '有效',
          actual: validUntil,
          result: isExpired ? '不匹配' : closeToExpire ? '待确认' : '匹配',
        }
      })

      const riskFlags = []
      const externalChecks = []
      if (isExpired) riskFlags.push('证书已过期')
      if (closeToExpire) riskFlags.push('证书接近到期')
      if (isMismatch) riskFlags.push('企业名称与供应商主数据不一致')
      if (needsConfirm) riskFlags.push('认证范围需要人工确认')
      if (lacksTech && supplier.enterprise.supplierType === 'raw') {
        riskFlags.push('触发一票否决：技术能力不满足')
      }

      if (lowerFileName.includes('ocr异常')) {
        externalChecks.push({
          id: createId('ext'),
          serviceCode: 'ocr-engine',
          serviceName: 'OCR 识别服务',
          checkItem: '材料字段识别',
          materialName: fileName,
          affectedFields: ['认证范围', '证书有效期'],
          status: 'exception',
          exceptionType: 'timeout',
          message: 'OCR 识别服务调用超时，未返回完整字段。',
          fallbackSuggestion: '请人工核对证书中的认证范围、有效期及关键字段。',
        })
      }

      if (lowerFileName.includes('工商异常')) {
        externalChecks.push({
          id: createId('ext'),
          serviceCode: 'business-registry',
          serviceName: '工商信息核验接口',
          checkItem: '主体工商比对',
          materialName: fileName,
          affectedFields: ['企业名称', '统一社会信用代码', '法人'],
          status: 'exception',
          exceptionType: 'service-unavailable',
          message: '工商信息接口暂时不可用，未返回主体比对结果。',
          fallbackSuggestion: '请人工核对营业执照、企业信息页和主数据是否一致。',
        })
      }

      if (lowerFileName.includes('验真异常') || lowerFileName.includes('核验异常')) {
        externalChecks.push({
          id: createId('ext'),
          serviceCode: 'certificate-platform',
          serviceName: '证书验真平台',
          checkItem: '证书真伪核验',
          materialName: fileName,
          affectedFields: ['证书编号', '有效期'],
          status: 'exception',
          exceptionType: 'no-response',
          message: '证书验真平台暂未返回核验结果。',
          fallbackSuggestion: '请结合供应商原件、证书编号和有效期先行人工判断。',
        })
      }

      const mismatchCount = comparisons.filter((item) => item.result === '不匹配').length
      const pendingCount = comparisons.filter((item) => item.result === '待确认').length
      const baseQuality = Math.max(55, 95 - mismatchCount * 12 - (isExpired ? 20 : 0) - pendingCount * 4)
      const baseTechnical = Math.max(50, 92 - (lacksTech ? 40 : 0) - mismatchCount * 8 - pendingCount * 3)
      const baseBusiness = Math.max(60, 90 - mismatchCount * 8 - pendingCount * 4)
      const bonus = supplier.enterprise.greenCertified ? 4 : 0
      const total = Math.round(
        baseQuality * template.weights.quality +
          baseTechnical * template.weights.technical +
          baseBusiness * template.weights.business +
          bonus,
      )

      const machineStatus = riskFlags.some((item) => item.includes('一票否决') || item.includes('过期'))
        ? 'fail'
        : riskFlags.length
          ? 'warning'
          : 'pass'

      return {
        extractedFields: {
          enterpriseName: currentName,
          creditCode: supplier.enterprise.creditCode,
          legalPerson: currentLegalPerson,
          validUntil,
          certificationScope: actualScope,
        },
        comparisons,
        riskFlags,
        externalChecks,
        precheckScore: total,
        scoreBreakdown: {
          quality: baseQuality,
          technical: baseTechnical,
          business: baseBusiness,
          bonus,
          total,
        },
        sameSourceMatches: this.resolveSameSourceMatches(supplier),
        machineStatus,
        previewUrl:
          previewUrl ||
          (mimeType.includes('pdf')
            ? SAMPLE_PDF_DATA_URI
            : createInlineImage(fileName?.replace(/\.[^.]+$/, '') || '资质文件')),
      }
    },
    canUploadCategory(supplierId, category, reuploadOf = '') {
      return !this.documents.some((item) => {
        if (item.supplierId !== supplierId || item.category !== category) return false
        if (reuploadOf && item.id === reuploadOf) return false
        return item.status === 'pending' || item.status === 'approved' || item.status === 'conditional'
      })
    },
    createNotificationMessage(record, supplier, trigger) {
      const profile = this.getRiskProfile(record)
      const alertLabels = profile.alerts.slice(0, 3).map((item) => item.label)
      const suffix = alertLabels.length ? `：${alertLabels.join('、')}` : ''
      const actionText =
        trigger === 'review-auto' || record.status === 'rejected'
          ? '请尽快查看管理员意见并补传新文件。'
          : '请尽快登录系统查看并处理。'
      return `【悟空资质助手】贵司文件《${record.fileName}》存在${profile.status.label}告警${suffix}。${actionText}`
    },
    sendRiskNotification({ recordId, operatorName = '系统', trigger = 'manual', mode = 'manual', customMessage = '' }) {
      const record = this.documents.find((item) => item.id === recordId)
      if (!record) {
        throw new Error('未找到对应文件记录。')
      }

      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(record.supplierId)
      if (!supplier?.enterprise?.contactPhone) {
        throw new Error('当前供应商未维护手机号，无法发送短信通知。')
      }

      const profile = this.getRiskProfile(record)
      if (!profile.alerts.length) {
        throw new Error('当前文件暂无告警，不需要发送风险提醒。')
      }

      const log = {
        id: createId('msg'),
        recordId: record.id,
        supplierId: supplier.id,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        phone: supplier.enterprise.contactPhone,
        channel: 'sms',
        mode,
        trigger,
        operatorName,
        riskLabel: profile.status.label,
        alertLabels: profile.alerts.map((item) => item.label),
        message: customMessage || this.createNotificationMessage(record, supplier, trigger),
        status: 'sent',
        sentAt: new Date().toISOString(),
      }

      this.notificationLogs.unshift(log)
      return log
    },
    uploadDocuments({ supplierId, category, files, reuploadOf = '', uploadSource = 'supplier', operatorName = '' }) {
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到当前供应商。')
      }

      if (!files?.length) {
        throw new Error('请至少选择一个文件后再提交。')
      }

      if (category !== 'other' && files.length > 1) {
        throw new Error('除“其他资质”外，同一类型一次仅允许提交一个文件。')
      }

      if (!this.canUploadCategory(supplierId, category, reuploadOf)) {
        throw new Error('同一供应商不能重复上传同类型且仍在生效中的文件。')
      }

      return files.map((file) => {
        const previousRecord = reuploadOf ? this.documents.find((item) => item.id === reuploadOf) : undefined
        const result = this.buildMachineResult({
          supplier,
          category,
          fileName: file.name,
          mimeType: file.type,
          previewUrl: file.previewUrl || '',
        })

        const uploadedAt = new Date().toISOString()
        const record = {
          id: createId('doc'),
          taskNo: this.createTaskNo(),
          supplierId,
          fileName: file.name,
          category,
          mimeType: file.type || 'application/octet-stream',
          sizeMB: Number((file.size / 1024 / 1024).toFixed(2)),
          uploadedAt,
          status: 'pending',
          machineStatus: result.machineStatus,
          previewUrl: result.previewUrl,
          standardTemplateId: supplier.enterprise.templateId,
          extractedFields: result.extractedFields,
          comparisons: result.comparisons,
          riskFlags: result.riskFlags,
          externalChecks: result.externalChecks,
          precheckScore: result.precheckScore,
          scoreBreakdown: result.scoreBreakdown,
          sameSourceMatches: result.sameSourceMatches,
          adminOpinion: '',
          unmetClauses: [],
          improvementSuggestions: [],
          appealable: false,
          appealDeadline: '',
          reviewerName: '',
          reviewedAt: '',
          reuploadOf,
          nextReviewAt: dateAfterYears(uploadedAt, 5),
          uploadSource,
          uploadedByRole: uploadSource === 'admin' ? 'admin' : 'supplier',
          uploadedByName: operatorName || (uploadSource === 'admin' ? '管理员代上传' : supplier.enterprise.contactName),
        }

        this.documents.unshift(record)

        if (reuploadOf) {
          this.createRereviewTask({
            supplierId,
            recordId: record.id,
            previousRecordId: reuploadOf,
            category,
            triggerSource: 'file-update',
            taskType: 'change',
            reason:
              this.getRenewalState(previousRecord).reason ||
              previousRecord?.adminOpinion ||
              '供应商更新资质文件后，系统已自动触发变更重审。',
            operatorName: operatorName || supplier.enterprise.contactName || '供应商',
            syncLifecycle: true,
          })
        }

        if (this.getRiskProfile(record).alerts.length) {
          this.sendRiskNotification({
            recordId: record.id,
            operatorName: '系统',
            trigger: uploadSource === 'admin' ? 'admin-upload-auto' : 'upload-auto',
            mode: 'auto',
          })
        }

        return this.getRecord(record.id)
      })
    },
    reviewDocument({
      recordId,
      reviewerName,
      status,
      opinion,
      scoreBreakdown,
      unmetClauses = [],
      improvementSuggestions = [],
      appealable = false,
      appealDeadline = '',
      externalChecks = [],
    }) {
      const record = this.documents.find((item) => item.id === recordId)
      if (!record) {
        throw new Error('未找到待审核记录。')
      }

      if (record.status === 'approved') {
        throw new Error('已通过文件已锁定，不可再次审核。')
      }

      if ((status === 'rejected' || status === 'conditional') && !String(opinion || '').trim()) {
        throw new Error(status === 'conditional' ? '有条件通过时必须填写审核意见。' : '未通过时必须填写未通过原因。')
      }

      const normalizedClauses = normalizeTextList(unmetClauses)
      const normalizedSuggestions = normalizeTextList(improvementSuggestions)
      const normalizedExternalChecks = normalizeExternalChecks({ ...record, externalChecks })
      const unresolvedExternalChecks = normalizedExternalChecks.filter((item) => item.pendingManual)

      if ((status === 'rejected' || status === 'conditional') && !normalizedClauses.length) {
        throw new Error('请至少填写一条未满足条款。')
      }

      if (status !== 'pending' && unresolvedExternalChecks.length) {
        throw new Error('请先完成外部接口异常项的人工复核结论。')
      }

      const suppliersStore = useSuppliersStore()
      const standardsStore = useStandardsStore()
      const supplier = suppliersStore.currentSupplier(record.supplierId)
      const threshold = standardsStore.resolveThreshold(supplier.enterprise)
      const vetoHit = record.riskFlags.some((item) => item.includes('一票否决'))

      if (status === 'approved' && (scoreBreakdown.total < threshold || vetoHit)) {
        throw new Error('当前评分未达到准入门槛，或触发了一票否决项，不能直接审核通过。')
      }

      record.status = status
      record.reviewerName = reviewerName
      record.reviewedAt = new Date().toISOString()
      record.adminOpinion = opinion
      record.scoreBreakdown = { ...scoreBreakdown }
      record.externalChecks = normalizedExternalChecks.map((item) => ({
        id: item.id,
        serviceCode: item.serviceCode,
        serviceName: item.serviceName,
        checkItem: item.checkItem,
        materialName: item.materialName,
        affectedFields: item.affectedFields,
        affectedMaterials: item.affectedMaterials,
        status: item.manualDecision ? 'manual-reviewed' : item.status,
        exceptionType: item.exceptionType,
        message: item.message,
        fallbackSuggestion: item.fallbackSuggestion,
        manualDecision: item.manualDecision,
        manualNote: item.manualNote,
        handledAt: item.manualDecision ? item.handledAt || record.reviewedAt : '',
        handledBy: item.manualDecision ? item.handledBy || reviewerName : '',
      }))
      record.unmetClauses = status === 'conditional' || status === 'rejected' ? normalizedClauses : []
      record.improvementSuggestions =
        status === 'conditional' || status === 'rejected' ? normalizedSuggestions : []
      record.appealable = status === 'approved' || status === 'pending' ? false : Boolean(appealable)
      record.appealDeadline =
        status === 'approved' || status === 'pending'
          ? ''
          : record.appealable
            ? appealDeadline || buildAppealDeadline(record.reviewedAt)
            : ''

      this.reviewLogs.unshift({
        id: createId('log'),
        recordId: record.id,
        taskNo: record.taskNo,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        reviewer: reviewerName,
        action:
          status === 'approved'
            ? '审核通过'
            : status === 'conditional'
              ? '审核有条件通过'
              : status === 'rejected'
                ? '审核未通过'
                : '保持审核中',
        result:
          status === 'approved'
            ? '已通过'
            : status === 'conditional'
              ? '有条件通过'
              : status === 'rejected'
                ? '未通过'
                : '审核中',
        score: scoreBreakdown.total,
        comment: opinion,
        reviewedAt: record.reviewedAt,
      })

      if (status === 'rejected' || status === 'conditional') {
        this.sendRiskNotification({
          recordId: record.id,
          operatorName: '系统',
          trigger: 'review-auto',
          mode: 'auto',
        })
      }

      return this.getRecord(record.id)
    },
    latestApprovedRecordBySupplier(supplierId) {
      return this.recordsBySupplier(supplierId).filter((item) => item.status === 'approved')[0]
    },
  },
})

