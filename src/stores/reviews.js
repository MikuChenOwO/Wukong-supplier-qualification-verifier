import { defineStore } from 'pinia'
import { MOCK_DOCUMENTS, MOCK_REVIEW_LOGS } from '../constants/mockData'
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

function classifyRenewal(record) {
  if (!record) return { needUpdate: false, level: 'safe', label: '正常', daysLeft: null, reason: '文件状态正常' }

  if (record.status === 'rejected') {
    return {
      needUpdate: true,
      level: 'rejected',
      label: '需重新提交',
      daysLeft: null,
      reason: record.adminOpinion || '审核未通过，需要重新上传或补充材料。',
    }
  }

  const validUntil = record.extractedFields?.validUntil
  if (!validUntil) {
    return { needUpdate: false, level: 'safe', label: '正常', daysLeft: null, reason: '未识别到有效期' }
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
      reason: `证书已过期 ${Math.abs(daysLeft)} 天，请尽快更新。`,
    }
  }

  if (daysLeft <= 45) {
    return {
      needUpdate: true,
      level: 'expiring',
      label: '即将过期',
      daysLeft,
      reason: `距离证书到期还有 ${daysLeft} 天，建议提前更新。`,
    }
  }

  return { needUpdate: false, level: 'safe', label: '正常', daysLeft, reason: `距离到期还有 ${daysLeft} 天` }
}

export const useReviewsStore = defineStore('reviews', {
  state: () => ({
    documents: clone(MOCK_DOCUMENTS),
    reviewLogs: clone(MOCK_REVIEW_LOGS),
  }),
  getters: {
    recordsBySupplier: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    pendingRecords: (state) =>
      state.documents
        .filter((item) => item.status === 'pending')
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    getRecord: (state) => (recordId) => state.documents.find((item) => item.id === recordId),
    renewalRecords: (state) =>
      state.documents
        .map((item) => ({ ...item, renewalState: classifyRenewal(item) }))
        .filter((item) => item.renewalState.needUpdate)
        .sort((a, b) => {
          const priority = { expired: 0, rejected: 1, expiring: 2 }
          return (priority[a.renewalState.level] ?? 9) - (priority[b.renewalState.level] ?? 9)
        }),
    renewalRecordsBySupplier: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .map((item) => ({ ...item, renewalState: classifyRenewal(item) }))
        .filter((item) => item.renewalState.needUpdate)
        .sort((a, b) => {
          const priority = { expired: 0, rejected: 1, expiring: 2 }
          return (priority[a.renewalState.level] ?? 9) - (priority[b.renewalState.level] ?? 9)
        }),
    supplierArchive: (state) => (supplierId) =>
      state.documents
        .filter((item) => item.supplierId === supplierId)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
  },
  actions: {
    getRenewalState(record) {
      return classifyRenewal(record)
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
      const currentName = isMismatch
        ? `${supplier.enterprise.enterpriseName}-旧档`
        : supplier.enterprise.enterpriseName
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
    uploadDocuments({ supplierId, category, files, reuploadOf = '' }) {
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到当前供应商。')
      }

      if (!files?.length) {
        throw new Error('请至少选择一个文件后再提交。')
      }

      if (category !== 'other' && files.length > 1) {
        throw new Error('同类型文件禁止重复上传，非“其他资质”一次仅允许提交一个文件。')
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

        const record = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          taskNo: this.createTaskNo(),
          supplierId,
          fileName: file.name,
          category,
          mimeType: file.type || 'application/octet-stream',
          sizeMB: Number((file.size / 1024 / 1024).toFixed(2)),
          uploadedAt: new Date().toISOString(),
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
          nextReviewAt: dateAfterYears(new Date().toISOString(), 5),
        }

        this.documents.unshift(record)
        return record
      })
    },
    reviewDocument({ recordId, reviewerName, status, opinion, scoreBreakdown }) {
      const record = this.getRecord(recordId)
      if (!record) {
        throw new Error('未找到待审核记录。')
      }

      if (record.status === 'approved') {
        throw new Error('已通过文件已锁定，不可再次审核。')
      }

      if (status === 'rejected' && !String(opinion || '').trim()) {
        throw new Error('未通过时必须填写未通过理由。')
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
        id: `log-${Date.now()}`,
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

      return record
    },
    latestApprovedRecordBySupplier(supplierId) {
      return this.documents
        .filter((item) => item.supplierId === supplierId && item.status === 'approved')
        .sort((a, b) => new Date(b.reviewedAt || b.uploadedAt) - new Date(a.reviewedAt || a.uploadedAt))[0]
    },
  },
})
