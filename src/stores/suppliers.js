import { defineStore } from 'pinia'
import { MOCK_SUPPLIERS } from '../constants/mockData'
import { useStandardsStore } from './standards'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: clone(MOCK_SUPPLIERS),
  }),
  getters: {
    currentSupplier: (state) => (supplierId) => state.suppliers.find((item) => item.id === supplierId),
    supplierMap: (state) => Object.fromEntries(state.suppliers.map((item) => [item.id, item])),
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
      }
      this.suppliers.unshift(supplier)
      return supplier
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
      })
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
