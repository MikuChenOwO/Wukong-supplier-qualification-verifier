import { defineStore } from 'pinia'
import { MOCK_DOCUMENTS, MOCK_NOTIFICATION_LOGS, MOCK_REVIEW_LOGS } from '../constants/mockData'
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
  },
  actions: {
    getRenewalState(record) {
      return classifyRenewal(record)
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
        return item.status === 'pending' || item.status === 'approved'
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
    reviewDocument({ recordId, reviewerName, status, opinion, scoreBreakdown }) {
      const record = this.documents.find((item) => item.id === recordId)
      if (!record) {
        throw new Error('未找到待审核记录。')
      }

      if (record.status === 'approved') {
        throw new Error('已通过文件已锁定，不可再次审核。')
      }

      if (status === 'rejected' && !String(opinion || '').trim()) {
        throw new Error('未通过时必须填写未通过原因。')
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

      this.reviewLogs.unshift({
        id: createId('log'),
        recordId: record.id,
        taskNo: record.taskNo,
        supplierName: supplier.enterprise.enterpriseName,
        fileName: record.fileName,
        reviewer: reviewerName,
        action: status === 'approved' ? '审核通过' : status === 'rejected' ? '审核未通过' : '保持审核中',
        result: status === 'approved' ? '已通过' : status === 'rejected' ? '未通过' : '审核中',
        score: scoreBreakdown.total,
        comment: opinion,
        reviewedAt: record.reviewedAt,
      })

      if (status === 'rejected') {
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
