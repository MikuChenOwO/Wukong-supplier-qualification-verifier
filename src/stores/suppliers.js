import { defineStore } from 'pinia'
import { MOCK_SUPPLIERS } from '../constants/mockData'
import { useStandardsStore } from './standards'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createBatchNo(prefix = 'BATCH-IMP') {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function normalizeSupplier(supplier) {
  return {
    ...supplier,
    teamMembers: supplier.teamMembers || [],
    relatedParties: supplier.relatedParties || [],
    changeHistory: supplier.changeHistory || [],
    lifecycle: {
      status: 'active',
      archiveSource: 'portal',
      lastRiskScanAt: '2026-04-27T09:00:00',
      latestReviewTrigger: '',
      freezeReason: '',
      tags: [],
      lifecycleLogs: [],
      ...(supplier.lifecycle || {}),
    },
  }
}

function appendLifecycleLog(supplier, payload) {
  supplier.lifecycle.lifecycleLogs.unshift({
    id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...payload,
  })
}

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: clone(MOCK_SUPPLIERS).map(normalizeSupplier),
    importBatches: [],
  }),
  getters: {
    currentSupplier: (state) => (supplierId) => state.suppliers.find((item) => item.id === supplierId),
    supplierMap: (state) => Object.fromEntries(state.suppliers.map((item) => [item.id, item])),
    recentImportBatches: (state) => state.importBatches.slice().sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt)),
  },
  actions: {
    registerSupplier(form) {
      const supplierId = `sup-${Date.now()}`
      const supplier = {
        id: supplierId,
        account: form.account,
        password: form.password,
        registeredAt: new Date().toISOString(),
        enterprise: {
          enterpriseName: form.enterpriseName,
          creditCode: form.creditCode,
          legalPerson: form.legalPerson,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          registerAddress: form.registerAddress,
          productionAddress: form.productionAddress || form.registerAddress,
          foundedAt: form.foundedAt || '',
          registeredCapital: form.registeredCapital || '',
          businessScope: form.businessScope || '',
          supplierType: form.supplierType,
          productLevel: form.productLevel,
          templateId: form.templateId,
          greenCertified: false,
        },
        teamMembers: [],
        relatedParties: [{ name: form.legalPerson, relation: '法人', idNo: form.legalIdNo || '' }],
        changeHistory: [],
        lifecycle: {
          status: 'active',
          archiveSource: form.archiveSource || 'portal',
          lastRiskScanAt: new Date().toISOString(),
          latestReviewTrigger: '',
          freezeReason: '',
          tags: [],
          lifecycleLogs: [],
        },
      }
      const normalizedSupplier = normalizeSupplier(supplier)
      this.suppliers.unshift(normalizedSupplier)
      return normalizedSupplier
    },
    createSupplierByAdmin(form) {
      const account = String(form.account || '').trim() || `supplier${String(this.suppliers.length + 1).padStart(2, '0')}`
      const password = String(form.password || '').trim() || '123456'

      if (this.existsAccount(account)) {
        throw new Error('该登录账号已存在，请更换后再保存。')
      }

      if (this.suppliers.some((item) => item.enterprise.creditCode === form.creditCode)) {
        throw new Error('该统一社会信用代码已存在，请勿重复创建供应商。')
      }

      if (this.suppliers.some((item) => item.enterprise.contactPhone === form.contactPhone)) {
        throw new Error('该联系人手机号已被其他供应商使用。')
      }

      return this.registerSupplier({
        ...form,
        account,
        password,
        archiveSource: 'admin-created',
      })
    },
    importSuppliersByAdmin({ items = [], operatorName = '管理员', note = '建立存量供应商电子档案' }) {
      if (!items.length) {
        throw new Error('请至少选择一条存量供应商后再导入。')
      }

      const batchNo = createBatchNo()
      const importedSuppliers = []
      const skippedSuppliers = []

      items.forEach((item, index) => {
        if (this.suppliers.some((supplier) => supplier.enterprise.creditCode === item.creditCode)) {
          skippedSuppliers.push({
            enterpriseName: item.enterpriseName,
            creditCode: item.creditCode,
            reason: '统一社会信用代码已存在',
          })
          return
        }

        const account = item.account || `legacy${String(this.suppliers.length + importedSuppliers.length + index + 1).padStart(2, '0')}`
        const password = item.password || '123456'

        if (this.existsAccount(account)) {
          skippedSuppliers.push({
            enterpriseName: item.enterpriseName,
            creditCode: item.creditCode,
            reason: '登录账号已存在',
          })
          return
        }

        const supplier = this.registerSupplier({
          account,
          password,
          enterpriseName: item.enterpriseName,
          creditCode: item.creditCode,
          legalPerson: item.legalPerson,
          contactName: item.contactName,
          contactPhone: item.contactPhone,
          registerAddress: item.registerAddress,
          productionAddress: item.productionAddress,
          foundedAt: item.foundedAt,
          registeredCapital: item.registeredCapital,
          businessScope: item.businessScope,
          supplierType: item.supplierType,
          productLevel: item.productLevel,
          templateId: item.templateId,
          archiveSource: 'batch-import',
        })

        supplier.teamMembers = item.teamMembers || supplier.teamMembers
        supplier.relatedParties = item.relatedParties || supplier.relatedParties
        supplier.lifecycle.status = item.lifecycleStatus || 'active'
        supplier.lifecycle.tags = [...(item.tags || [])]
        supplier.lifecycle.lastRiskScanAt = new Date().toISOString()
        supplier.lifecycle.latestReviewTrigger = item.latestReviewTrigger || ''

        appendLifecycleLog(supplier, {
          actor: operatorName,
          action: '批量导入建档',
          note: `导入批次 ${batchNo}：${item.note || '已建立存量供应商电子档案，并纳入后续动态监控。'}`,
          source: 'batch-import',
        })

        importedSuppliers.push(supplier)
      })

      const batch = {
        id: `imp-${Date.now()}`,
        batchNo,
        importedAt: new Date().toISOString(),
        operatorName,
        total: items.length,
        successCount: importedSuppliers.length,
        skippedCount: skippedSuppliers.length,
        note,
        supplierNames: importedSuppliers.map((item) => item.enterprise.enterpriseName),
        skippedSuppliers,
      }

      this.importBatches.unshift(batch)
      return {
        batch,
        importedSuppliers,
        skippedSuppliers,
      }
    },
    updateEnterprise(supplierId, payload) {
      const supplier = this.currentSupplier(supplierId)
      if (!supplier) return { matched: false }

      Object.entries(payload).forEach(([field, value]) => {
        const previous = supplier.enterprise[field]
        if (previous !== value && previous !== undefined) {
          supplier.changeHistory.unshift({
            id: `chg-${Date.now()}-${field}`,
            at: new Date().toISOString(),
            field,
            from: previous,
            to: value,
          })
        }
      })

      supplier.enterprise = { ...supplier.enterprise, ...payload }
      return this.verifyBusinessInfo(payload.creditCode || supplier.enterprise.creditCode, supplier.enterprise)
    },
    updateLifecycleStatus(supplierId, { status, reason = '', operatorName = '系统', source = 'manual' }) {
      const supplier = this.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到对应供应商。')
      }

      supplier.lifecycle.status = status
      supplier.lifecycle.lastRiskScanAt = new Date().toISOString()
      supplier.lifecycle.freezeReason = status === 'frozen' ? reason : ''

      appendLifecycleLog(supplier, {
        actor: operatorName,
        action: status === 'frozen' ? '供应商冻结' : status === 'watch' ? '进入重点观察' : '恢复正常',
        note: reason || (status === 'active' ? '风险解除，恢复正常状态。' : '系统已更新供应商生命周期状态。'),
        source,
      })

      return supplier
    },
    triggerSupplierRereview(supplierId, { operatorName = '管理员', reason = '' }) {
      const supplier = this.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到对应供应商。')
      }

      supplier.lifecycle.latestReviewTrigger = reason || '证书风险触发重审'
      supplier.lifecycle.lastRiskScanAt = new Date().toISOString()
      appendLifecycleLog(supplier, {
        actor: operatorName,
        action: '触发重审',
        note: reason || '已根据动态风控结果触发重审流程。',
        source: 'risk-radar',
      })

      return supplier
    },
    updateSupplierTags(supplierId, tags = []) {
      const supplier = this.currentSupplier(supplierId)
      if (!supplier) {
        throw new Error('未找到对应供应商。')
      }

      supplier.lifecycle.tags = [...tags]
      supplier.lifecycle.lastRiskScanAt = new Date().toISOString()
      return supplier
    },
    verifyBusinessInfo(creditCode, enterprise) {
      const standardsStore = useStandardsStore()
      const registry = standardsStore.findRegistryEntry(creditCode)

      if (!registry) {
        return {
          matched: false,
          level: 'warning',
          message: '工商 Mock 数据库中未找到该统一社会信用代码，请管理员人工核验。',
        }
      }

      const mismatches = []
      if (enterprise?.enterpriseName && registry.enterpriseName !== enterprise.enterpriseName) {
        mismatches.push('企业名称')
      }
      if (enterprise?.legalPerson && registry.legalPerson !== enterprise.legalPerson) {
        mismatches.push('法人')
      }
      if (enterprise?.registerAddress && registry.registerAddress !== enterprise.registerAddress) {
        mismatches.push('注册地址')
      }

      if (mismatches.length) {
        return {
          matched: false,
          level: 'warning',
          message: `工商信息存在差异：${mismatches.join('、')}，建议重新核对后保存。`,
          registry,
        }
      }

      return {
        matched: true,
        level: 'success',
        message: `已匹配工商 Mock 数据：${registry.enterpriseName}（${registry.status}）`,
        registry,
      }
    },
    existsAccount(account) {
      return this.suppliers.some((item) => item.account === account)
    },
    resetPasswordByPhone(phone, newPassword) {
      const supplier = this.suppliers.find((item) => item.enterprise.contactPhone === phone || item.account === phone)
      if (!supplier) {
        throw new Error('未找到该手机号对应的供应商账号。')
      }
      supplier.password = newPassword
      return supplier
    },
  },
})
