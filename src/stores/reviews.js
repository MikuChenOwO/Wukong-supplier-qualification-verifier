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

function buildRiskAlerts(record, renewalState = classifyRenewal(record)) {
  const alerts = []
  const riskFlags = record?.riskFlags || []

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

  if (record?.status === 'pending' && record?.machineStatus === 'warning') {
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
  const riskAlerts = buildRiskAlerts(record, renewalState)
  const riskStatus = resolveRiskStatus(riskAlerts)

  return {
    ...record,
    renewalState,
    riskAlerts,
    riskStatus,
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
  },
  actions: {
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
    createAppealNotificationMessage(appeal, record, status, feedback = '') {
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
      if (isExpired) riskFlags.push('证书已过期')
      if (closeToExpire) riskFlags.push('证书接近到期')
      if (isMismatch) riskFlags.push('企业名称与供应商主数据不一致')
      if (needsConfirm) riskFlags.push('认证范围需要人工确认')
      if (lacksTech && supplier.enterprise.supplierType === 'raw') {
        riskFlags.push('触发一票否决：技术能力不满足')
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

      if ((status === 'rejected' || status === 'conditional') && !normalizedClauses.length) {
        throw new Error('请至少填写一条未满足条款。')
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
