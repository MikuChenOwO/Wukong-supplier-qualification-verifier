import { defineStore } from 'pinia'
import {
  CASE_LIBRARY,
  DOCUMENT_TYPES,
  KNOWLEDGE_BASE,
  MOCK_BUSINESS_REGISTRY,
  PRODUCT_LEVELS,
  STANDARD_FIELD_LIBRARY,
  STANDARD_TEMPLATES,
  SUPPLIER_TYPES,
  THRESHOLD_MATRIX,
} from '../constants/mockData'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export const useStandardsStore = defineStore('standards', {
  state: () => ({
    supplierTypes: clone(SUPPLIER_TYPES),
    productLevels: clone(PRODUCT_LEVELS),
    documentTypes: clone(DOCUMENT_TYPES),
    fieldLibrary: clone(STANDARD_FIELD_LIBRARY),
    templates: clone(STANDARD_TEMPLATES),
    thresholdMatrix: clone(THRESHOLD_MATRIX),
    businessRegistry: clone(MOCK_BUSINESS_REGISTRY),
    knowledgeBase: clone(KNOWLEDGE_BASE),
    caseLibrary: clone(CASE_LIBRARY),
    reminderYears: 5,
  }),
  getters: {
    activeTemplates: (state) => state.templates.filter((item) => item.status === '启用'),
    faqCategories: (state) => ['全部', ...new Set(state.knowledgeBase.map((item) => item.category))],
    caseCategories: (state) => ['全部', ...new Set(state.caseLibrary.map((item) => item.caseCategory))],
  },
  actions: {
    findRegistryEntry(creditCode) {
      return this.businessRegistry.find((item) => item.creditCode === creditCode)
    },
    findTemplateById(templateId) {
      return this.templates.find((item) => item.id === templateId)
    },
    resolveThreshold(enterprise) {
      if (!enterprise) return 80
      if (enterprise.supplierType === 'tech') return this.thresholdMatrix.tech
      if (enterprise.supplierType === 'transport') return this.thresholdMatrix.transport
      if (enterprise.supplierType === 'other') return this.thresholdMatrix.other
      return this.thresholdMatrix[enterprise.productLevel] || 80
    },
    upsertTemplate(payload) {
      const index = this.templates.findIndex((item) => item.id === payload.id)
      if (index >= 0) {
        this.templates[index] = { ...this.templates[index], ...payload }
      } else {
        this.templates.unshift({
          ...payload,
          id: payload.id || `std-${Date.now()}`,
        })
      }
    },
    toggleTemplateStatus(id) {
      const template = this.findTemplateById(id)
      if (!template) return
      template.status = template.status === '启用' ? '停用' : '启用'
    },
  },
})
