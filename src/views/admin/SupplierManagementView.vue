<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDateTime, formatPhone, normalizeKeyword } from '../../utils/format'

const authStore = useAuthStore()
const suppliersStore = useSuppliersStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const keywordInput = ref('')
const keyword = ref('')
const archiveBatchKeywordInput = ref('')
const archiveBatchKeyword = ref('')
const drawerVisible = ref(false)
const batchDetailVisible = ref(false)
const createDialogVisible = ref(false)
const importDialogVisible = ref(false)
const historyBackfillDialogVisible = ref(false)
const currentSupplierId = ref('')
const tab = ref('profile')
const adminUploading = ref(false)
const creatingSupplier = ref(false)
const importingSuppliers = ref(false)
const backfillingHistory = ref(false)
const uploadRef = ref(null)
const uploadFileList = ref([])
const createFormRef = ref(null)
const importTemplateUploadRef = ref(null)
const importTemplateFiles = ref([])
const importTemplateFileName = ref('')
const historyTemplateUploadRef = ref(null)
const historyTemplateFiles = ref([])
const historyTemplateFileName = ref('')
const showcaseOpen = ref([])
const batchDetailType = ref('import')
const selectedImportBatchId = ref('')
const selectedHistoryBatchId = ref('')

const uploadForm = reactive({
  category: 'business-license',
  reuploadOf: '',
})

const createForm = reactive({
  account: '',
  password: '123456',
  enterpriseName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  registerAddress: '',
  productionAddress: '',
  supplierType: 'raw',
  productLevel: 'A',
  foundedAt: '',
  registeredCapital: '',
  businessScope: '',
})

const createRules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  creditCode: [
    { required: true, message: '请输入统一社会信用代码', trigger: 'blur' },
    { pattern: /^[0-9A-Z]{18}$/, message: '统一社会信用代码应为 18 位大写字母或数字', trigger: 'blur' },
  ],
  legalPerson: [{ required: true, message: '请输入法人代表', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系人手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' },
  ],
  registerAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  supplierType: [{ required: true, message: '请选择供应商类型', trigger: 'change' }],
  productLevel: [{ required: true, message: '请选择产品等级', trigger: 'change' }],
}

const defaultImportFieldMapping = {
  enterpriseName: '供应商名称',
  creditCode: '统一社会信用代码',
  legalPerson: '法人代表',
  contactName: '联系人',
  contactPhone: '联系电话',
  registerAddress: '注册地址',
  productionAddress: '生产/经营地址',
  foundedAt: '成立日期',
  registeredCapital: '注册资本',
  businessScope: '经营范围',
  supplierType: '供应商类型',
  productLevel: '产品等级',
  lifecycleStatus: '生命周期状态',
  tags: '风险标签',
  latestReviewTrigger: '最近复审触发',
  note: '导入说明',
}

const importFieldMapping = reactive({ ...defaultImportFieldMapping })
const historyBackfillRule = reactive({
  preset: 'annual-review',
  includeConditional: true,
  includeRejected: true,
  keepOriginalReviewer: true,
})

const importTargetFields = [
  { key: 'enterpriseName', label: '供应商名称', required: true },
  { key: 'creditCode', label: '统一社会信用代码', required: true },
  { key: 'legalPerson', label: '法人代表', required: true },
  { key: 'contactName', label: '联系人', required: true },
  { key: 'contactPhone', label: '联系电话', required: true },
  { key: 'registerAddress', label: '注册地址', required: true },
  { key: 'productionAddress', label: '生产/经营地址' },
  { key: 'foundedAt', label: '成立日期' },
  { key: 'registeredCapital', label: '注册资本' },
  { key: 'businessScope', label: '经营范围' },
  { key: 'supplierType', label: '供应商类型', required: true },
  { key: 'productLevel', label: '产品等级', required: true },
  { key: 'lifecycleStatus', label: '生命周期状态' },
  { key: 'tags', label: '风险标签' },
  { key: 'latestReviewTrigger', label: '最近复审触发' },
  { key: 'note', label: '导入说明' },
]

const historyBackfillRuleOptions = [
  {
    value: 'annual-review',
    label: '年度复审汇总',
    fileColumns: {
      period: '历史期间',
      fileName: '材料名称',
      category: '材料类型',
      status: '审核结论',
      reviewedAt: '审核时间',
      reviewerName: '审核人',
      scoreTotal: '评分',
      validUntil: '有效期',
      opinion: '审核意见',
      unmetClauses: '未满足条款',
      improvementSuggestions: '整改建议',
    },
  },
  {
    value: 'certificate-ledger',
    label: '证书台账回填',
    fileColumns: {
      period: '台账周期',
      fileName: '附件名称',
      category: '资质类别',
      status: '复核结果',
      reviewedAt: '复核日期',
      reviewerName: '处理人',
      scoreTotal: '综合得分',
      validUntil: '证书截止日期',
      opinion: '复核说明',
      unmetClauses: '风险项',
      improvementSuggestions: '补录建议',
    },
  },
  {
    value: 'mixed-archive',
    label: '混合档案补录',
    fileColumns: {
      period: '档案阶段',
      fileName: '文件标题',
      category: '文件分类',
      status: '历史结论',
      reviewedAt: '归档时间',
      reviewerName: '归档人',
      scoreTotal: '历史得分',
      validUntil: '失效日期',
      opinion: '归档备注',
      unmetClauses: '遗留问题',
      improvementSuggestions: '后续动作',
    },
  },
]

const importSourceRows = [
  {
    rowNo: 1,
    供应商名称: '华星钛金制造（天津）有限公司',
    统一社会信用代码: '91120116MA06Q7D95K',
    法人代表: '陈拓',
    联系人: '吕青',
    联系电话: '13377889911',
    注册地址: '天津市滨海新区智造港 6 号',
    '生产/经营地址': '天津市滨海新区装备园 3 号厂房',
    成立日期: '2017-11-08',
    注册资本: '2600 万人民币',
    经营范围: '精密钣金件、焊接件、模组结构件制造与交付',
    供应商类型: '配套件',
    产品等级: 'B类',
    生命周期状态: '正常',
    风险标签: '存量导入、历史合格供应商',
    最近复审触发: '历史档案导入完成，等待年度复审',
    导入说明: '历史审核记录完整，可直接建立电子档案',
  },
  {
    rowNo: 2,
    供应商名称: '北斗智运仓配（武汉）有限公司',
    统一社会信用代码: '91420100MA4KX5T62P',
    法人代表: '韩策',
    联系人: '顾航',
    联系电话: '13255668899',
    注册地址: '武汉市东湖高新区光谷大道 58 号',
    '生产/经营地址': '武汉市江夏区周转件 8 号',
    成立日期: '2018-06-19',
    注册资本: '1400 万人民币',
    经营范围: '周转配送、仓配协同、物流包装器具维护',
    供应商类型: '运输类',
    产品等级: 'C类',
    生命周期状态: '重点观察',
    风险标签: '存量导入、证书临期',
    最近复审触发: '临期证书已纳入季度复审',
    导入说明: '存在证书临期记录，导入后纳入重点观察',
  },
  {
    rowNo: 3,
    供应商名称: '辰启智造材料（苏州）有限公司',
    统一社会信用代码: '91320594MADEMOX19K',
    法人代表: '周堇',
    联系人: '孟原',
    联系电话: '13666778822',
    注册地址: '苏州市工业园区创智路 88 号',
    '生产/经营地址': '苏州市工业园区新材工坊 12 幢',
    成立日期: '2019-09-03',
    注册资本: '1800 万人民币',
    经营范围: '高分子复合材料、功能膜材、包装辅料生产',
    供应商类型: '原材料 / 外协外包类',
    产品等级: 'A类',
    生命周期状态: '正常',
    风险标签: '存量导入、需回填历史审核',
    最近复审触发: '等待补录 2024 年审核记录',
    导入说明: '电子档案需补录近两年复审结果',
  },
  {
    rowNo: 4,
    供应商名称: '远拓工业服务（成都）有限公司',
    统一社会信用代码: '',
    法人代表: '梁非',
    联系人: '穆然',
    联系电话: '13144556677',
    注册地址: '成都市高新区天府三街 199 号',
    '生产/经营地址': '成都市双流区园区运维中心 2 层',
    成立日期: '2020-03-12',
    注册资本: '1100 万人民币',
    经营范围: '驻场运维、综合服务、环保配套支持',
    供应商类型: '其他类',
    产品等级: 'C类',
    生命周期状态: '冻结',
    风险标签: '存量导入、冻结观察',
    最近复审触发: '证书过期，待更新后重审',
    导入说明: '缺少统一社会信用代码，需先人工补齐',
  },
  {
    rowNo: 5,
    供应商名称: '玖衡技术协同（西安）有限公司',
    统一社会信用代码: '91610131MATESTW12A',
    法人代表: '蒋岑',
    联系人: '苏鸣',
    联系电话: '18866',
    注册地址: '西安市高新区沣惠南路 18 号',
    '生产/经营地址': '西安市高新区协同研发基地 5 号楼',
    成立日期: '2021-01-26',
    注册资本: '900 万人民币',
    经营范围: '研发协同、试验支持、技术验证服务',
    供应商类型: '技术合作类',
    产品等级: 'B类',
    生命周期状态: '正常',
    风险标签: '新样例',
    最近复审触发: '新建档待首审',
    导入说明: '联系电话格式错误，需要修正后才能导入',
  },
  {
    rowNo: 6,
    供应商名称: '南岭贸易协同（深圳）有限公司',
    统一社会信用代码: '91440300MATRADE19P',
    法人代表: '乔闻',
    联系人: '袁汐',
    联系电话: '13788990011',
    注册地址: '深圳市南山区科技南十二路 2 号',
    '生产/经营地址': '深圳市南山区供应链中心 7 层',
    成立日期: '2016-05-18',
    注册资本: '2300 万人民币',
    经营范围: '进出口贸易、备件协同、跨区域履约支持',
    供应商类型: '中间商类',
    产品等级: 'D类',
    生命周期状态: '正常',
    风险标签: '模板映射校验',
    最近复审触发: '待确定准入门槛',
    导入说明: '产品等级超出模板范围，需要管理员修正映射值',
  },
]

const supplierTypeAliasMap = {
  '原材料 / 外协外包类': 'raw',
  配套件: 'parts',
  中间商类: 'trade',
  技术合作类: 'tech',
  运输类: 'transport',
  其他类: 'other',
}

const lifecycleAliasMap = {
  正常: 'active',
  重点观察: 'watch',
  冻结: 'frozen',
}

const productLevelAliasMap = {
  A类: 'A',
  B类: 'B',
  C类: 'C',
}

const templateOptions = computed(() =>
  standardsStore.activeTemplates.filter((item) => item.supplierType === createForm.supplierType),
)

const supplierRows = computed(() =>
  suppliersStore.suppliers
    .filter((item) =>
      !keyword.value ||
      normalizeKeyword(item.enterprise.enterpriseName).includes(normalizeKeyword(keyword.value)) ||
      normalizeKeyword(item.enterprise.creditCode).includes(normalizeKeyword(keyword.value)),
    )
    .map((item) => {
      const records = reviewsStore.recordsBySupplier(item.id)
      const riskRecords = reviewsStore.riskRecordsBySupplier(item.id)
      const notifications = reviewsStore.notificationsBySupplier(item.id)
      const backfillBatches = suppliersStore.archiveBackfillBatchesBySupplier(item.id)
      return {
        ...item,
        filesCount: records.length,
        approvedCount: records.filter((record) => record.status === 'approved').length,
        riskCount: riskRecords.length,
        notifiedCount: notifications.length,
        backfillCount: backfillBatches.length,
      }
    }),
)

const currentSupplier = computed(() => suppliersStore.currentSupplier(currentSupplierId.value))
const currentRecords = computed(() => reviewsStore.recordsBySupplier(currentSupplierId.value))
const currentRiskRecords = computed(() => reviewsStore.riskRecordsBySupplier(currentSupplierId.value))
const currentNotifications = computed(() => reviewsStore.notificationsBySupplier(currentSupplierId.value))
const currentLifecycle = computed(() => currentSupplier.value?.lifecycle || {})
const currentAdminUploads = computed(() =>
  currentRecords.value.filter((item) => item.uploadSource === 'admin').slice(0, 8),
)
const currentApprovedRecords = computed(() => currentRecords.value.filter((item) => item.status === 'approved').slice(0, 6))
const currentArchiveRecords = computed(() => currentRecords.value.slice(0, 12))
const replaceableRecords = computed(() =>
  currentRecords.value.filter((item) => item.category === uploadForm.category).slice(0, 12),
)
const currentImportBatches = computed(() =>
  suppliersStore.recentImportBatches
    .filter((item) => item.supplierNames?.includes(currentSupplier.value?.enterprise.enterpriseName))
    .slice(0, 4),
)
const currentHistoryBackfillBatches = computed(() =>
  suppliersStore.archiveBackfillBatchesBySupplier(currentSupplierId.value).slice(0, 6),
)
const currentHistoricalRecords = computed(() =>
  currentRecords.value.filter((item) => item.isHistoricalBackfill).slice(0, 10),
)
const selectedImportBatch = computed(() =>
  suppliersStore.recentImportBatches.find((item) => item.id === selectedImportBatchId.value),
)
const selectedHistoryBackfillBatch = computed(() =>
  suppliersStore.recentArchiveBackfillBatches.find((item) => item.id === selectedHistoryBatchId.value),
)
const batchDetailTitle = computed(() => {
  if (batchDetailType.value === 'history') {
    return selectedHistoryBackfillBatch.value?.batchNo || '历史回填批次详情'
  }
  return selectedImportBatch.value?.batchNo || '导入批次详情'
})
const selectedHistoryBackfillRecordRows = computed(() => {
  const batch = selectedHistoryBackfillBatch.value
  if (!batch?.recordIds?.length) return []
  return batch.recordIds.map((recordId) => reviewsStore.getRecord(recordId)).filter(Boolean)
})
const filteredCurrentImportBatches = computed(() =>
  currentImportBatches.value.filter((item) => batchMatchesArchiveQuery(item, 'import')),
)
const filteredCurrentHistoryBackfillBatches = computed(() =>
  currentHistoryBackfillBatches.value.filter((item) => batchMatchesArchiveQuery(item, 'history')),
)
const relatedHistoryBatchRows = computed(() => {
  if (!selectedImportBatch.value?.supplierNames?.length) return []
  return suppliersStore.recentArchiveBackfillBatches.filter((item) =>
    selectedImportBatch.value.supplierNames.includes(item.supplierName),
  )
})
const relatedImportBatchRows = computed(() => {
  if (!selectedHistoryBackfillBatch.value?.supplierName) return []
  return suppliersStore.recentImportBatches.filter((item) =>
    item.supplierNames?.includes(selectedHistoryBackfillBatch.value.supplierName),
  )
})
const templateShowcases = computed(() =>
  standardsStore.activeTemplates.slice(0, 6).map((item) => ({
    ...item,
    supplierTypeLabel: supplierTypeLabel(item.supplierType),
    requiredLabels: (item.requiredDocuments || []).map((value) => documentTypeLabel(value)),
    recommendedLabels: (item.recommendedDocuments || []).map((value) => documentTypeLabel(value)),
  })),
)

const adminUploadBatches = computed(() => {
  const groups = new Map()

  reviewsStore.enrichedDocuments
    .filter((item) => item.uploadSource === 'admin' && item.batchNo)
    .forEach((item) => {
      const current = groups.get(item.batchNo) || {
        batchNo: item.batchNo,
        latestAt: item.uploadedAt,
        supplierNames: new Set(),
        categories: new Set(),
        count: 0,
      }

      current.latestAt = new Date(item.uploadedAt) > new Date(current.latestAt) ? item.uploadedAt : current.latestAt
      current.supplierNames.add(suppliersStore.currentSupplier(item.supplierId)?.enterprise.enterpriseName || item.supplierId)
      current.categories.add(documentTypeLabel(item.category))
      current.count += 1
      groups.set(item.batchNo, current)
    })

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      supplierNames: Array.from(item.supplierNames),
      categories: Array.from(item.categories),
    }))
    .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
    .slice(0, 4)
})

const notificationBatches = computed(() => {
  const groups = new Map()

  reviewsStore.notificationLogs
    .filter((item) => item.batchNo)
    .forEach((item) => {
      const current = groups.get(item.batchNo) || {
        batchNo: item.batchNo,
        latestAt: item.sentAt,
        supplierNames: new Set(),
        levels: new Set(),
        count: 0,
      }

      current.latestAt = new Date(item.sentAt) > new Date(current.latestAt) ? item.sentAt : current.latestAt
      current.supplierNames.add(item.supplierName)
      current.levels.add(item.riskLabel)
      current.count += 1
      groups.set(item.batchNo, current)
    })

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      supplierNames: Array.from(item.supplierNames),
      levels: Array.from(item.levels),
    }))
    .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
    .slice(0, 4)
})

const importBatchRows = computed(() => suppliersStore.recentImportBatches.slice(0, 6))
const importColumnOptions = computed(() => {
  const keys = new Set()
  importSourceRows.forEach((row) => {
    Object.keys(row)
      .filter((key) => key !== 'rowNo')
      .forEach((key) => keys.add(key))
  })
  return Array.from(keys)
})

const importFieldMappingRows = computed(() =>
  importTargetFields.map((item) => ({
    ...item,
    source: importFieldMapping[item.key] || '',
  })),
)

const parsedImportRows = computed(() => {
  if (!importTemplateFileName.value) return []

  return importSourceRows.map((row) => {
    const getValue = (fieldKey) => String(row[importFieldMapping[fieldKey]] || '').trim()
    const enterpriseName = getValue('enterpriseName')
    const creditCode = getValue('creditCode').toUpperCase()
    const legalPerson = getValue('legalPerson')
    const contactName = getValue('contactName')
    const contactPhone = getValue('contactPhone')
    const registerAddress = getValue('registerAddress')
    const productionAddress = getValue('productionAddress') || registerAddress
    const foundedAt = getValue('foundedAt')
    const registeredCapital = getValue('registeredCapital')
    const businessScope = getValue('businessScope')
    const supplierTypeLabelText = getValue('supplierType')
    const productLevelLabelText = getValue('productLevel')
    const lifecycleLabelText = getValue('lifecycleStatus')
    const tagsText = getValue('tags')
    const latestReviewTrigger = getValue('latestReviewTrigger')
    const note = getValue('note')

    const errors = []

    importTargetFields
      .filter((field) => field.required)
      .forEach((field) => {
        if (!importFieldMapping[field.key]) {
          errors.push(`未映射字段：${field.label}`)
        }
      })

    if (!enterpriseName) errors.push('供应商名称为空')
    if (!creditCode) {
      errors.push('统一社会信用代码为空')
    } else if (!/^[0-9A-Z]{18}$/.test(creditCode)) {
      errors.push('统一社会信用代码格式错误')
    }
    if (!legalPerson) errors.push('法人代表为空')
    if (!contactName) errors.push('联系人为空')
    if (!contactPhone) {
      errors.push('联系电话为空')
    } else if (!/^1\d{10}$/.test(contactPhone)) {
      errors.push('联系电话格式错误')
    }
    if (!registerAddress) errors.push('注册地址为空')

    const supplierType = supplierTypeAliasMap[supplierTypeLabelText]
    if (!supplierType) errors.push('供应商类型无法映射')

    const productLevel = productLevelAliasMap[productLevelLabelText]
    if (!productLevel) errors.push('产品等级无法映射')

    const lifecycleStatus = lifecycleAliasMap[lifecycleLabelText] || 'active'
    const tags = tagsText ? tagsText.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean) : []
    const templateId = resolveTemplateId(supplierType, productLevel)

    if (supplierType && productLevel && !templateId) {
      errors.push('未匹配到对应准入模板')
    }

    return {
      rowNo: row.rowNo,
      enterpriseName,
      creditCode,
      legalPerson,
      contactName,
      contactPhone,
      registerAddress,
      productionAddress,
      foundedAt,
      registeredCapital,
      businessScope,
      supplierType,
      supplierTypeLabel: supplierTypeLabelText || '--',
      productLevel,
      productLevelLabel: productLevelLabelText || '--',
      lifecycleStatus,
      lifecycleLabel: lifecycleLabelText || '正常',
      latestReviewTrigger,
      note,
      tags,
      templateId,
      valid: !errors.length,
      reasonSummary: errors.join('；'),
    }
  })
})

const validImportRows = computed(() => parsedImportRows.value.filter((item) => item.valid))
const invalidImportRows = computed(() => parsedImportRows.value.filter((item) => !item.valid))
const importPreviewSummary = computed(() => ({
  total: parsedImportRows.value.length,
  valid: validImportRows.value.length,
  invalid: invalidImportRows.value.length,
  mapped: importFieldMappingRows.value.filter((item) => item.source).length,
}))

const historyBackfillRuleOption = computed(() =>
  historyBackfillRuleOptions.find((item) => item.value === historyBackfillRule.preset) || historyBackfillRuleOptions[0],
)
const historyBackfillBaseCandidates = computed(() =>
  historyTemplateFileName.value ? buildHistoryBackfillCandidates(currentSupplier.value, historyBackfillRule.preset) : [],
)
const historyBackfillCandidates = computed(() =>
  historyBackfillBaseCandidates.value
    .filter((item) => (historyBackfillRule.includeConditional ? true : item.status !== 'conditional'))
    .filter((item) => (historyBackfillRule.includeRejected ? true : item.status !== 'rejected'))
    .map((item) => ({
      ...item,
      reviewerName: historyBackfillRule.keepOriginalReviewer ? item.reviewerName : authStore.displayName,
    })),
)
const historyBackfillPreviewSummary = computed(() => ({
  total: historyBackfillBaseCandidates.value.length,
  valid: historyBackfillCandidates.value.length,
  skipped: Math.max(historyBackfillBaseCandidates.value.length - historyBackfillCandidates.value.length, 0),
}))
const historyBackfillParseConfigSummary = computed(() => [
  { label: '解析规则', value: historyBackfillRuleOption.value?.label || '--' },
  { label: '来源文件', value: historyTemplateFileName.value || '--' },
  { label: '保留原审核人', value: historyBackfillRule.keepOriginalReviewer ? '是' : '否' },
  { label: '纳入有条件通过', value: historyBackfillRule.includeConditional ? '是' : '否' },
  { label: '纳入未通过', value: historyBackfillRule.includeRejected ? '是' : '否' },
])

watch(importDialogVisible, (visible) => {
  if (!visible) {
    importingSuppliers.value = false
  }
})

function supplierTypeLabel(value) {
  return standardsStore.supplierTypes.find((item) => item.value === value)?.label || value || '--'
}

function archiveSourceLabel(value) {
  if (value === 'batch-import') return '批量导入'
  if (value === 'admin-created') return '管理员建档'
  return '供应商注册'
}

function lifecycleTagType(value) {
  return value === 'frozen' ? 'danger' : value === 'watch' ? 'warning' : 'success'
}

function lifecycleLabel(value) {
  return value === 'frozen' ? '已冻结' : value === 'watch' ? '重点观察' : '正常'
}

function documentTypeLabel(value) {
  return standardsStore.documentTypes.find((item) => item.value === value)?.label || value
}

function historyStatusLabel(value) {
  return value === 'approved' ? '通过' : value === 'conditional' ? '有条件通过' : value === 'rejected' ? '未通过' : value
}

function batchMatchesArchiveQuery(batch, type = 'import') {
  if (!archiveBatchKeyword.value) return true

  const tokens =
    type === 'history'
      ? [
          batch.batchNo,
          batch.sourceFileName,
          batch.parseRuleName,
          batch.note,
          batch.supplierName,
          ...(batch.recordNames || []),
        ]
      : [
          batch.batchNo,
          batch.sourceFileName,
          batch.note,
          ...(batch.supplierNames || []),
        ]

  return normalizeKeyword(tokens.filter(Boolean).join(' ')).includes(normalizeKeyword(archiveBatchKeyword.value))
}

function resolveTemplateId(supplierType, productLevel) {
  if (!supplierType) return ''
  return (
    standardsStore.activeTemplates.find((item) => item.supplierType === supplierType && item.productLevel === productLevel)?.id ||
    standardsStore.activeTemplates.find((item) => item.supplierType === supplierType)?.id ||
    ''
  )
}

function buildHistoryBackfillCandidates(supplier, preset = 'annual-review') {
  if (!supplier) return []

  const name = supplier.enterprise.enterpriseName
  const validUntilYear = new Date().getFullYear() + 2
  const isCertificateLedger = preset === 'certificate-ledger'
  const isMixedArchive = preset === 'mixed-archive'

  return [
    {
      historyPeriod: isCertificateLedger ? '2024 证照复核台账' : isMixedArchive ? '准入归档阶段' : '2024 年度准入复核',
      fileName: `${name}-${isMixedArchive ? '主体资料归档' : '营业执照'}-2024.pdf`,
      category: 'business-license',
      status: 'approved',
      reviewedAt: '2024-06-18T10:30:00',
      reviewerName: '采购审核员-李宁',
      scoreTotal: 92,
      validUntil: `${validUntilYear}-12-31`,
      certificationScope: '企业主体经营资质',
      opinion: '主体信息完整，历史审核通过。',
      unmetClauses: [],
      improvementSuggestions: [],
    },
    {
      historyPeriod: isCertificateLedger ? '2025 体系证书续期' : isMixedArchive ? '年度质量档案补录' : '2025 半年度体系复核',
      fileName: `${name}-质量体系证书-2025.pdf`,
      category: 'quality-system',
      status: supplier.lifecycle.status === 'watch' ? 'conditional' : 'approved',
      reviewedAt: '2025-02-24T15:10:00',
      reviewerName: '质量复核员-周敏',
      scoreTotal: supplier.lifecycle.status === 'watch' ? 83 : 89,
      validUntil: `${validUntilYear}-08-30`,
      certificationScope: '质量管理体系范围核验',
      opinion: supplier.lifecycle.status === 'watch' ? '证书临期，要求季度内完成续期更新。' : '体系证书范围满足准入要求。',
      unmetClauses: supplier.lifecycle.status === 'watch' ? ['证书剩余有效期不足 6 个月'] : [],
      improvementSuggestions: supplier.lifecycle.status === 'watch' ? ['下次复审前补录续期证书'] : [],
    },
    {
      historyPeriod: isCertificateLedger ? '2025 专项资质复核台账' : isMixedArchive ? '专项能力归档补录' : '2025 年度专项资质复核',
      fileName: `${name}-${isCertificateLedger ? '专项证书台账' : '专项资质'}-2025.pdf`,
      category: supplier.enterprise.supplierType === 'tech' ? 'patent-cert' : 'other',
      status: supplier.lifecycle.status === 'frozen' ? 'rejected' : isMixedArchive ? 'conditional' : 'approved',
      reviewedAt: '2025-09-12T11:40:00',
      reviewerName: '专项审核员-吴桐',
      scoreTotal: supplier.lifecycle.status === 'frozen' ? 74 : isMixedArchive ? 82 : 88,
      validUntil: `${validUntilYear}-10-31`,
      certificationScope: supplier.enterprise.supplierType === 'tech' ? '专利与研发能力证明' : '专项资质与补充材料',
      opinion:
        supplier.lifecycle.status === 'frozen'
          ? '历史专项资质存在过期项，已要求补件后重新提交。'
          : isMixedArchive
            ? '已补录专项能力材料，但仍需补充末页签章。'
            : '专项资质审核通过，可纳入电子档案。',
      unmetClauses:
        supplier.lifecycle.status === 'frozen'
          ? ['专项资质存在过期项']
          : isMixedArchive
            ? ['专项能力附件缺少末页签章']
            : [],
      improvementSuggestions:
        supplier.lifecycle.status === 'frozen'
          ? ['补传更新后的资质证明后重新复核']
          : isMixedArchive
            ? ['补录签章完整版本后更新归档记录']
            : [],
    },
  ]
}
function openDrawer(row, initialTab = 'profile') {
  currentSupplierId.value = row.id
  drawerVisible.value = true
  tab.value = initialTab
  resetArchiveBatchSearch()
  uploadForm.category = 'business-license'
  uploadForm.reuploadOf = ''
  resetUploadSelection()
}

function applyKeywordSearch() {
  keyword.value = keywordInput.value.trim()
}

function resetKeywordSearch() {
  keywordInput.value = ''
  keyword.value = ''
}

function applyArchiveBatchSearch() {
  archiveBatchKeyword.value = archiveBatchKeywordInput.value.trim()
}

function resetArchiveBatchSearch() {
  archiveBatchKeywordInput.value = ''
  archiveBatchKeyword.value = ''
}

function resetCreateForm() {
  createForm.account = ''
  createForm.password = '123456'
  createForm.enterpriseName = ''
  createForm.creditCode = ''
  createForm.legalPerson = ''
  createForm.contactName = ''
  createForm.contactPhone = ''
  createForm.registerAddress = ''
  createForm.productionAddress = ''
  createForm.supplierType = 'raw'
  createForm.productLevel = 'A'
  createForm.foundedAt = ''
  createForm.registeredCapital = ''
  createForm.businessScope = ''
  createFormRef.value?.clearValidate()
}

function openCreateDialog() {
  resetCreateForm()
  createDialogVisible.value = true
}

function resetImportDraft() {
  importTemplateFiles.value = []
  importTemplateFileName.value = ''
  Object.assign(importFieldMapping, defaultImportFieldMapping)
  importTemplateUploadRef.value?.clearFiles()
}

function resetHistoryBackfillDraft() {
  historyTemplateFiles.value = []
  historyTemplateFileName.value = ''
  historyBackfillRule.preset = 'annual-review'
  historyBackfillRule.includeConditional = true
  historyBackfillRule.includeRejected = true
  historyBackfillRule.keepOriginalReviewer = true
  historyTemplateUploadRef.value?.clearFiles()
}

function openImportDialog() {
  resetImportDraft()
  importDialogVisible.value = true
}

function validateHistoryTemplateFile(file) {
  return validateImportTemplateFile(file)
}

function handleHistoryTemplateChange(_, files) {
  const latest = files.at(-1)
  if (!latest || !validateHistoryTemplateFile(latest)) {
    historyTemplateFiles.value = []
    historyTemplateFileName.value = ''
    historyTemplateUploadRef.value?.clearFiles()
    return
  }

  historyTemplateFiles.value = [latest]
  historyTemplateFileName.value = latest.name
}

function handleHistoryTemplateRemove() {
  historyTemplateFiles.value = []
  historyTemplateFileName.value = ''
}

function openHistoryBackfillDialog() {
  if (!currentSupplier.value) return
  resetHistoryBackfillDraft()
  historyBackfillDialogVisible.value = true
}

function openImportBatchDetail(batch) {
  if (!batch?.id) return
  batchDetailType.value = 'import'
  selectedImportBatchId.value = batch.id
  selectedHistoryBatchId.value = ''
  batchDetailVisible.value = true
}

function openHistoryBackfillBatchDetail(batch) {
  if (!batch?.id) return
  batchDetailType.value = 'history'
  selectedHistoryBatchId.value = batch.id
  selectedImportBatchId.value = ''
  batchDetailVisible.value = true
}

function sendNotification(row) {
  try {
    reviewsStore.sendRiskNotification({
      recordId: row.id,
      operatorName: authStore.displayName,
      trigger: 'manual',
      mode: 'manual',
    })
    ElMessage.success('已向供应商手机号发送短信提醒。')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function validateRawFile(rawFile) {
  const allowTypes = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowTypes.includes(rawFile.type)) {
    ElMessage.error('仅支持 PDF、PNG、JPG 文件。')
    return false
  }
  if (rawFile.size > 20 * 1024 * 1024) {
    ElMessage.error('单文件大小不能超过 20MB。')
    return false
  }
  return true
}

function beforeUpload(rawFile) {
  return validateRawFile(rawFile)
}

function handleUploadChange(_, files) {
  uploadFileList.value = files.filter((file) => !file.raw || validateRawFile(file.raw))
}

function handleUploadRemove(_, files) {
  uploadFileList.value = files
}

function buildPreviewUrl(file) {
  return file.raw ? URL.createObjectURL(file.raw) : ''
}

function normalizeFiles(files) {
  return files.map((file) => ({
    name: file.name,
    type: file.raw?.type || '',
    size: file.size,
    previewUrl: buildPreviewUrl(file),
  }))
}

function resetUploadSelection() {
  uploadFileList.value = []
  uploadRef.value?.clearFiles()
}

function validateImportTemplateFile(file) {
  const lowerName = String(file?.name || '').toLowerCase()
  const valid = ['.xlsx', '.xls', '.csv'].some((suffix) => lowerName.endsWith(suffix))
  if (!valid) {
    ElMessage.error('导入模板仅支持 .xlsx、.xls、.csv 文件。')
  }
  return valid
}

function handleImportTemplateChange(_, files) {
  const latest = files.at(-1)
  if (!latest || !validateImportTemplateFile(latest)) {
    importTemplateFiles.value = []
    importTemplateFileName.value = ''
    importTemplateUploadRef.value?.clearFiles()
    return
  }

  importTemplateFiles.value = [latest]
  importTemplateFileName.value = latest.name
}

function handleImportTemplateRemove() {
  importTemplateFiles.value = []
  importTemplateFileName.value = ''
}

function exportImportFailures() {
  if (!invalidImportRows.value.length) {
    ElMessage.info('当前没有失败明细可导出。')
    return
  }

  const header = ['行号', '供应商名称', '统一社会信用代码', '失败原因']
  const rows = invalidImportRows.value.map((item) => [
    item.rowNo,
    item.enterpriseName || '--',
    item.creditCode || '--',
    item.reasonSummary,
  ])

  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csvText = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = href
  link.download = `导入失败明细-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(href)
}

function submitAdminUpload() {
  if (!currentSupplier.value) return
  adminUploading.value = true

  setTimeout(() => {
    try {
      const result = reviewsStore.uploadDocuments({
        supplierId: currentSupplier.value.id,
        category: uploadForm.category,
        reuploadOf: uploadForm.reuploadOf,
        files: normalizeFiles(uploadFileList.value),
        uploadSource: 'admin',
        operatorName: authStore.displayName,
      })
      ElMessage.success(`已代供应商上传 ${result.length} 份文件，并进入预审核。`)
      resetUploadSelection()
      uploadForm.reuploadOf = ''
      tab.value = 'records'
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      adminUploading.value = false
    }
  }, 700)
}

async function submitCreateSupplier() {
  await createFormRef.value.validate()
  creatingSupplier.value = true

  setTimeout(() => {
    try {
      const supplier = suppliersStore.createSupplierByAdmin({
        ...createForm,
        templateId: templateOptions.value[0]?.id || standardsStore.activeTemplates[0]?.id || '',
      })
      createDialogVisible.value = false
      ElMessage.success(`已创建供应商档案，初始密码为 ${createForm.password}。`)
      openDrawer(supplier, 'upload')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      creatingSupplier.value = false
    }
  }, 500)
}

function submitImportSuppliers() {
  if (!importTemplateFileName.value) {
    ElMessage.warning('请先选择导入模板文件。')
    return
  }

  if (!validImportRows.value.length) {
    ElMessage.warning('当前没有可导入的有效数据，请先修正映射或源数据。')
    return
  }

  importingSuppliers.value = true

  setTimeout(() => {
    try {
      const result = suppliersStore.importSuppliersByAdmin({
        items: validImportRows.value.map((item) => ({
          rowNo: item.rowNo,
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
          lifecycleStatus: item.lifecycleStatus,
          latestReviewTrigger: item.latestReviewTrigger,
          tags: item.tags,
          note: item.note,
        })),
        operatorName: authStore.displayName,
        note: `通过模板文件 ${importTemplateFileName.value} 批量导入并建立电子档案`,
        sourceFileName: importTemplateFileName.value,
        mappingSummary: importFieldMappingRows.value.map((item) => ({
          target: item.label,
          source: item.source,
          required: item.required,
        })),
        failureDetails: invalidImportRows.value.map((item) => ({
          rowNo: item.rowNo,
          enterpriseName: item.enterpriseName,
          creditCode: item.creditCode,
          reason: item.reasonSummary,
        })),
      })

      importDialogVisible.value = false
      ElMessage.success(
        `已导入 ${result.importedSuppliers.length} 家供应商，失败/跳过 ${result.failureDetails.length} 条，批次已写入导入记录。`,
      )

      if (result.importedSuppliers[0]) {
        openDrawer(result.importedSuppliers[0], 'archive')
      }
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      importingSuppliers.value = false
    }
  }, 600)
}

function submitHistoryBackfill() {
  if (!currentSupplier.value) return
  if (!historyTemplateFileName.value) {
    ElMessage.warning('请先选择历史回填来源文件。')
    return
  }
  if (!historyBackfillCandidates.value.length) {
    ElMessage.warning('当前没有可回填的历史审核记录，请调整解析规则后再试。')
    return
  }

  backfillingHistory.value = true

  setTimeout(() => {
    try {
      const result = reviewsStore.backfillHistoricalReviews({
        supplierId: currentSupplier.value.id,
        operatorName: authStore.displayName,
        sourceFileName: historyTemplateFileName.value,
        note: `按规则“${historyBackfillRuleOption.value?.label || '历史回填'}”补录存量供应商历史审核记录`,
        parseRuleName: historyBackfillRuleOption.value?.label || '',
        parseConfigSummary: historyBackfillParseConfigSummary.value,
        sourceFileMeta: {
          name: historyTemplateFileName.value,
          rowCount: historyBackfillPreviewSummary.value.total,
          validCount: historyBackfillPreviewSummary.value.valid,
          skippedCount: historyBackfillPreviewSummary.value.skipped,
        },
        failureDetails:
          historyBackfillPreviewSummary.value.skipped > 0
            ? [
                {
                  rowNo: '规则过滤',
                  enterpriseName: currentSupplier.value.enterprise.enterpriseName,
                  creditCode: currentSupplier.value.enterprise.creditCode,
                  reason: `本次共有 ${historyBackfillPreviewSummary.value.skipped} 条记录因解析规则过滤未写入电子档案`,
                  field: 'historyBackfillRule',
                },
              ]
            : [],
        items: historyBackfillCandidates.value,
      })

      historyBackfillDialogVisible.value = false
      ElMessage.success(`已回填 ${result.records.length} 条历史审核记录，并写入电子档案。`)
      tab.value = 'archive'
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      backfillingHistory.value = false
    }
  }, 500)
}</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商管理</h1>
        <p>统一查看供应商档案、风险通知、电子档案、批量导入批次，以及历史审核回填情况。</p>
      </div>
    </div>

    <div class="section-card table-card">
      <div class="toolbar top-toolbar">
        <el-input
          v-model="keywordInput"
          placeholder="搜索企业名称或统一社会信用代码"
          clearable
          style="max-width: 320px"
          @keyup.enter="applyKeywordSearch"
          @clear="resetKeywordSearch"
        />
        <el-button type="primary" plain @click="applyKeywordSearch">搜索</el-button>
        <el-button plain @click="resetKeywordSearch">重置</el-button>
        <el-button type="warning" plain @click="openImportDialog">批量导入存量供应商</el-button>
        <el-button type="primary" @click="openCreateDialog">新增供应商</el-button>
      </div>

      <div class="table-scroll">
        <el-table :data="supplierRows" class="app-table" stripe>
          <el-table-column prop="enterprise.enterpriseName" label="供应商名称" min-width="220" />
          <el-table-column prop="enterprise.creditCode" label="统一社会信用代码" min-width="190" />
          <el-table-column label="供应商类型" min-width="170">
            <template #default="{ row }">
              {{ supplierTypeLabel(row.enterprise.supplierType) }}
            </template>
          </el-table-column>
          <el-table-column prop="filesCount" label="档案文件数" min-width="110" />
          <el-table-column prop="approvedCount" label="已通过数" min-width="110" />
          <el-table-column prop="riskCount" label="风险文件数" min-width="110" />
          <el-table-column prop="backfillCount" label="回填批次数" min-width="110" />
          <el-table-column label="档案来源" min-width="130">
            <template #default="{ row }">{{ archiveSourceLabel(row.lifecycle.archiveSource) }}</template>
          </el-table-column>
          <el-table-column label="生命周期" min-width="120">
            <template #default="{ row }">
              <el-tag :type="lifecycleTagType(row.lifecycle.status)">{{ lifecycleLabel(row.lifecycle.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="入驻时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.registeredAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="220" fixed="right">
            <template #default="{ row }">
              <div class="toolbar">
                <el-button text type="primary" @click="openDrawer(row, 'profile')">查看档案</el-button>
                <el-button text type="warning" @click="openDrawer(row, 'archive')">电子档案</el-button>
                <el-button text type="success" @click="openDrawer(row, 'upload')">代上传文件</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="section-card showcase-wrapper">
      <div class="panel-title">
        <div>
          <h3>批量导入记录</h3>
          <p>保留最近导入批次，方便追溯来源文件、字段映射情况和失败规模。</p>
        </div>
      </div>

      <el-table :data="importBatchRows" class="app-table" stripe>
        <el-table-column prop="batchNo" label="导入批次" min-width="180" />
        <el-table-column label="来源文件" min-width="180">
          <template #default="{ row }">{{ row.sourceFileName || '--' }}</template>
        </el-table-column>
        <el-table-column label="导入时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.importedAt) }}</template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" min-width="120" />
        <el-table-column prop="mappedFieldCount" label="映射字段数" min-width="110" />
        <el-table-column prop="successCount" label="成功数" min-width="90" />
        <el-table-column prop="failureCount" label="失败/跳过" min-width="100" />
        <el-table-column label="导入供应商" min-width="260">
          <template #default="{ row }">{{ row.supplierNames?.join('、') || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openImportBatchDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="section-card showcase-wrapper">
      <div class="panel-title">
        <div>
          <h3>Mock 示例区</h3>
          <p>默认收起，避免影响主操作。演示时可查看材料模板、批量代上传和批量通知样例。</p>
        </div>
      </div>
      <el-collapse v-model="showcaseOpen">
        <el-collapse-item title="查看材料组合、批量代上传和批量通知示例" name="mock-showcases">
          <div class="showcase-grid">
            <div class="section-card showcase-panel">
              <div class="panel-title">
                <div>
                  <h3>供应商类型材料组合示例</h3>
                  <p>展示不同供应商类型及模板要求，便于快速切换演示场景。</p>
                </div>
                <el-tag type="success">{{ templateShowcases.length }} 套模板</el-tag>
              </div>
              <div class="template-showcase-list">
                <div v-for="item in templateShowcases" :key="item.id" class="template-showcase-item">
                  <div class="template-showcase-head">
                    <strong>{{ item.name }}</strong>
                    <el-tag>{{ item.supplierTypeLabel }}</el-tag>
                  </div>
                  <p>{{ item.productLevel }} 级准入，门槛 {{ item.threshold }} 分</p>
                  <div class="mini-section">
                    <span>必传材料</span>
                    <div class="capsule-list">
                      <span v-for="label in item.requiredLabels" :key="`${item.id}-${label}`" class="capsule-item">{{ label }}</span>
                    </div>
                  </div>
                  <div v-if="item.recommendedLabels.length" class="mini-section">
                    <span>推荐补充</span>
                    <div class="capsule-list">
                      <span
                        v-for="label in item.recommendedLabels"
                        :key="`${item.id}-extra-${label}`"
                        class="capsule-item soft"
                      >
                        {{ label }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-card showcase-panel">
              <div class="panel-title">
                <div>
                  <h3>批量代上传演示</h3>
                  <p>模拟管理员为多家供应商集中补档，验证后台统一维护链路。</p>
                </div>
                <el-tag type="warning">{{ adminUploadBatches.length }} 个批次</el-tag>
              </div>
              <div v-if="adminUploadBatches.length" class="batch-list">
                <div v-for="item in adminUploadBatches" :key="item.batchNo" class="batch-item">
                  <div class="batch-item-head">
                    <strong>{{ item.batchNo }}</strong>
                    <el-tag type="warning">{{ item.count }} 份文件</el-tag>
                  </div>
                  <p>{{ item.supplierNames.join('、') }}</p>
                  <div class="capsule-list">
                    <span v-for="label in item.categories" :key="`${item.batchNo}-${label}`" class="capsule-item">{{ label }}</span>
                  </div>
                  <span class="batch-time">{{ formatDateTime(item.latestAt) }}</span>
                </div>
              </div>
              <div v-else class="rich-empty">当前还没有批量代上传示例。</div>
            </div>

            <div class="section-card showcase-panel">
              <div class="panel-title">
                <div>
                  <h3>批量通知演示</h3>
                  <p>模拟管理员一键向多家供应商发送风险通知，验证通知批次和覆盖范围。</p>
                </div>
                <el-tag type="danger">{{ notificationBatches.length }} 个批次</el-tag>
              </div>
              <div v-if="notificationBatches.length" class="batch-list">
                <div v-for="item in notificationBatches" :key="item.batchNo" class="batch-item">
                  <div class="batch-item-head">
                    <strong>{{ item.batchNo }}</strong>
                    <el-tag type="danger">{{ item.count }} 条通知</el-tag>
                  </div>
                  <p>{{ item.supplierNames.join('、') }}</p>
                  <div class="capsule-list">
                    <span v-for="label in item.levels" :key="`${item.batchNo}-${label}`" class="capsule-item soft">{{ label }}</span>
                  </div>
                  <span class="batch-time">{{ formatDateTime(item.latestAt) }}</span>
                </div>
              </div>
              <div v-else class="rich-empty">当前还没有批量通知示例。</div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <el-drawer v-model="drawerVisible" :title="currentSupplier?.enterprise.enterpriseName" size="62%" append-to-body>
      <el-tabs v-model="tab">
        <el-tab-pane label="企业档案" name="profile">
          <div class="metric-row">
            <span>企业名称</span>
            <strong>{{ currentSupplier?.enterprise.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ currentSupplier?.enterprise.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>联系人</span>
            <strong>{{ currentSupplier?.enterprise.contactName }} / {{ formatPhone(currentSupplier?.enterprise.contactPhone || '') }}</strong>
          </div>
          <div class="metric-row">
            <span>法人代表</span>
            <strong>{{ currentSupplier?.enterprise.legalPerson || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>注册地址</span>
            <strong>{{ currentSupplier?.enterprise.registerAddress || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>经营范围</span>
            <strong>{{ currentSupplier?.enterprise.businessScope || '--' }}</strong>
          </div>
        </el-tab-pane>

        <el-tab-pane label="电子档案" name="archive">
          <div class="content-grid archive-grid">
            <div class="section-card upload-card">
              <div class="panel-title">
                <div>
                  <h3>档案摘要</h3>
                  <p>查看档案来源、生命周期、回填批次和最近巡检情况。</p>
                </div>
                <el-tag :type="lifecycleTagType(currentLifecycle.status)">{{ lifecycleLabel(currentLifecycle.status) }}</el-tag>
              </div>
              <div class="metric-row">
                <span>档案来源</span>
                <strong>{{ archiveSourceLabel(currentLifecycle.archiveSource) }}</strong>
              </div>
              <div class="metric-row">
                <span>登录账号</span>
                <strong>{{ currentSupplier?.account || '--' }}</strong>
              </div>
              <div class="metric-row">
                <span>导入批次</span>
                <strong>{{ currentImportBatches.length }} 个</strong>
              </div>
              <div class="metric-row">
                <span>历史回填批次</span>
                <strong>{{ currentHistoryBackfillBatches.length }} 个</strong>
              </div>
              <div class="metric-row">
                <span>最近巡检</span>
                <strong>{{ currentLifecycle.lastRiskScanAt ? formatDateTime(currentLifecycle.lastRiskScanAt) : '--' }}</strong>
              </div>
              <div class="metric-row">
                <span>最新重审触发</span>
                <strong>{{ currentLifecycle.latestReviewTrigger || '--' }}</strong>
              </div>
              <div class="metric-row">
                <span>档案标签</span>
                <div class="capsule-list">
                  <span v-for="item in currentLifecycle.tags || []" :key="item" class="capsule-item">{{ item }}</span>
                  <span v-if="!(currentLifecycle.tags || []).length" class="status-text">暂无</span>
                </div>
              </div>
            </div>

            <div class="section-card upload-card">
              <div class="panel-title">
                <div>
                  <h3>归档文件概览</h3>
                  <p>优先展示已通过文件，快速判断电子档案完整度。</p>
                </div>
              </div>
              <el-table :data="currentApprovedRecords" class="app-table" stripe>
                <el-table-column prop="fileName" label="文件名称" min-width="220" />
                <el-table-column label="文件类型" min-width="150">
                  <template #default="{ row }">{{ documentTypeLabel(row.category) }}</template>
                </el-table-column>
                <el-table-column label="有效期" min-width="120">
                  <template #default="{ row }">{{ row.extractedFields.validUntil || '--' }}</template>
                </el-table-column>
                <el-table-column label="状态" min-width="110">
                  <template #default="{ row }">
                    <StatusTag :status="row.status" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>档案明细</h3>
                <p>统一展示当前电子档案中的最新文件、来源、历史回填标记和审核结果。</p>
              </div>
            </div>
            <el-table :data="currentArchiveRecords" class="app-table" stripe>
              <el-table-column prop="fileName" label="文件名称" min-width="220" />
              <el-table-column label="文件类型" min-width="150">
                <template #default="{ row }">{{ documentTypeLabel(row.category) }}</template>
              </el-table-column>
              <el-table-column label="来源" min-width="120">
                <template #default="{ row }">
                  {{ row.isHistoricalBackfill ? '历史回填' : row.uploadSource === 'admin' ? '管理员代上传' : '供应商上传' }}
                </template>
              </el-table-column>
              <el-table-column label="审核时间" min-width="160">
                <template #default="{ row }">{{ row.reviewedAt ? formatDateTime(row.reviewedAt) : '--' }}</template>
              </el-table-column>
              <el-table-column label="状态" min-width="120">
                <template #default="{ row }">
                  <StatusTag :status="row.status" />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>导入与回填记录</h3>
                <p>补全存量供应商电子档案的关键动作会在这里留痕，便于后续追溯。</p>
              </div>
              <div class="toolbar">
                <el-button type="primary" plain @click="openHistoryBackfillDialog">回填历史审核记录</el-button>
              </div>
            </div>

            <div class="toolbar batch-search-toolbar">
              <el-input
                v-model="archiveBatchKeywordInput"
                placeholder="搜索批次号、来源文件、备注或规则名称"
                clearable
                style="max-width: 360px"
                @keyup.enter="applyArchiveBatchSearch"
                @clear="resetArchiveBatchSearch"
              />
              <el-button type="primary" plain @click="applyArchiveBatchSearch">检索批次</el-button>
              <el-button plain @click="resetArchiveBatchSearch">重置</el-button>
            </div>

            <div class="content-grid archive-grid">
              <div class="section-card inner-card">
                <div class="panel-title">
                  <div>
                    <h3>导入批次</h3>
                    <p>查看该供应商是通过哪次导入建档的，并支持按批次号、来源文件联动检索。</p>
                  </div>
                </div>
                <el-table :data="filteredCurrentImportBatches" class="app-table" stripe>
                  <el-table-column prop="batchNo" label="批次号" min-width="180" />
                  <el-table-column label="来源文件" min-width="160">
                    <template #default="{ row }">{{ row.sourceFileName || '--' }}</template>
                  </el-table-column>
                  <el-table-column label="导入时间" min-width="150">
                    <template #default="{ row }">{{ formatDateTime(row.importedAt) }}</template>
                  </el-table-column>
                  <el-table-column label="操作" min-width="110" fixed="right">
                    <template #default="{ row }">
                      <el-button text type="primary" @click="openImportBatchDetail(row)">查看详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <div class="section-card inner-card">
                <div class="panel-title">
                  <div>
                    <h3>历史审核回填批次</h3>
                    <p>查看该供应商已补录的历史审核批次与结论分布，并和导入批次联动检索。</p>
                  </div>
                </div>
                <el-table :data="filteredCurrentHistoryBackfillBatches" class="app-table" stripe>
                  <el-table-column prop="batchNo" label="回填批次" min-width="180" />
                  <el-table-column label="回填时间" min-width="150">
                    <template #default="{ row }">{{ formatDateTime(row.backfilledAt) }}</template>
                  </el-table-column>
                  <el-table-column prop="approvedCount" label="通过" min-width="80" />
                  <el-table-column prop="conditionalCount" label="有条件通过" min-width="110" />
                  <el-table-column prop="rejectedCount" label="未通过" min-width="90" />
                  <el-table-column label="操作" min-width="110" fixed="right">
                    <template #default="{ row }">
                      <el-button text type="primary" @click="openHistoryBackfillBatchDetail(row)">查看详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>

          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>历史回填文件明细</h3>
                <p>集中查看已补录的历史审核文件及其对应结论。</p>
              </div>
            </div>
            <el-table :data="currentHistoricalRecords" class="app-table" stripe>
              <el-table-column prop="historyPeriod" label="历史期间" min-width="150" />
              <el-table-column prop="fileName" label="文件名称" min-width="220" />
              <el-table-column label="文件类型" min-width="150">
                <template #default="{ row }">{{ documentTypeLabel(row.category) }}</template>
              </el-table-column>
              <el-table-column label="审核人" min-width="120">
                <template #default="{ row }">{{ row.reviewerName || '--' }}</template>
              </el-table-column>
              <el-table-column label="审核结论" min-width="120">
                <template #default="{ row }">
                  <StatusTag :status="row.status" />
                </template>
              </el-table-column>
              <el-table-column label="审核时间" min-width="160">
                <template #default="{ row }">{{ formatDateTime(row.reviewedAt) }}</template>
              </el-table-column>
            </el-table>
          </div>

          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>生命周期日志</h3>
                <p>记录建档、冻结、重点观察、触发重审、历史回填等关键动作。</p>
              </div>
            </div>
            <div v-if="(currentLifecycle.lifecycleLogs || []).length" class="timeline-list">
              <div v-for="item in currentLifecycle.lifecycleLogs" :key="item.id" class="timeline-item">
                <strong>{{ item.action }}</strong>
                <span>{{ item.actor }} / {{ formatDateTime(item.at) }}</span>
                <p>{{ item.note }}</p>
              </div>
            </div>
            <div v-else class="rich-empty">当前还没有生命周期日志。</div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="风险与通知" name="risk">
          <el-table :data="currentRiskRecords" class="app-table" stripe>
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column label="风险状态" min-width="140">
              <template #default="{ row }">
                <RiskStatusTag :status="row.riskStatus" />
              </template>
            </el-table-column>
            <el-table-column label="告警类别" min-width="260">
              <template #default="{ row }">{{ row.riskAlerts.map((item) => item.label).join('、') }}</template>
            </el-table-column>
            <el-table-column label="通知状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="row.notificationState.type">{{ row.notificationState.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="danger" @click="sendNotification(row)">发送短信</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="soft-divider" />

          <el-table :data="currentNotifications" class="app-table" stripe>
            <el-table-column prop="fileName" label="关联文件" min-width="200" />
            <el-table-column prop="riskLabel" label="通知级别" min-width="120" />
            <el-table-column prop="operatorName" label="发送人" min-width="110" />
            <el-table-column label="发送方式" min-width="100">
              <template #default="{ row }">{{ row.mode === 'manual' ? '人工' : '自动' }}</template>
            </el-table-column>
            <el-table-column label="发送时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.sentAt) }}</template>
            </el-table-column>
            <el-table-column prop="message" label="短信内容" min-width="320" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="上传记录" name="records">
          <el-table :data="currentRecords" class="app-table" stripe>
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column prop="taskNo" label="任务号" min-width="140" />
            <el-table-column prop="precheckScore" label="预审分" min-width="90" />
            <el-table-column label="审核状态" min-width="110">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="风险状态" min-width="130">
              <template #default="{ row }">
                <RiskStatusTag :status="row.riskStatus" />
              </template>
            </el-table-column>
            <el-table-column label="上传来源" min-width="130">
              <template #default="{ row }">
                {{ row.isHistoricalBackfill ? '历史回填' : row.uploadSource === 'admin' ? '管理员代上传' : '供应商上传' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="管理员代上传" name="upload">
          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>代上传供应商文件</h3>
                <p>用于集中维护供应商电子档案，提交后仍会进入预审核流程。</p>
              </div>
            </div>

            <el-form label-position="top">
              <el-form-item label="文件类型">
                <el-select v-model="uploadForm.category">
                  <el-option
                    v-for="item in standardsStore.documentTypes"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item v-if="replaceableRecords.length" label="替换已有文件（可选）">
                <el-select v-model="uploadForm.reuploadOf" clearable placeholder="选择后按更新文件处理">
                  <el-option
                    v-for="item in replaceableRecords"
                    :key="item.id"
                    :label="`${item.fileName} / ${historyStatusLabel(item.status)}`"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>

              <el-upload
                ref="uploadRef"
                drag
                multiple
                :auto-upload="false"
                :file-list="uploadFileList"
                :before-upload="beforeUpload"
                :on-change="handleUploadChange"
                :on-remove="handleUploadRemove"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">将文件拖到此处，或 <em>点击选择文件</em></div>
                <template #tip>
                  <div class="status-text">支持 PDF、PNG、JPG，单文件不超过 20MB。</div>
                </template>
              </el-upload>
            </el-form>

            <div class="toolbar" style="margin-top: 18px">
              <el-button type="primary" :loading="adminUploading" @click="submitAdminUpload">提交代上传</el-button>
              <el-button plain @click="resetUploadSelection">清空</el-button>
            </div>
          </div>

          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>最近代上传记录</h3>
                <p>便于管理员回看由后台代维护的电子档案。</p>
              </div>
            </div>
            <el-table :data="currentAdminUploads" class="app-table" stripe>
              <el-table-column prop="fileName" label="文件名称" min-width="220" />
              <el-table-column label="上传时间" min-width="160">
                <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
              </el-table-column>
              <el-table-column label="风险状态" min-width="130">
                <template #default="{ row }">
                  <RiskStatusTag :status="row.riskStatus" />
                </template>
              </el-table-column>
              <el-table-column label="短信状态" min-width="130">
                <template #default="{ row }">
                  <el-tag :type="row.notificationState.type">{{ row.notificationState.label }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="变更历史" name="history">
          <el-table :data="currentSupplier?.changeHistory || []" class="app-table" stripe>
            <el-table-column prop="field" label="字段" min-width="120" />
            <el-table-column prop="from" label="变更前" min-width="180" />
            <el-table-column prop="to" label="变更后" min-width="180" />
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.at) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="createDialogVisible" title="新增供应商" width="760px" append-to-body align-center>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="create-form-grid">
          <el-form-item label="登录账号">
            <el-input v-model="createForm.account" placeholder="可选，不填则自动生成" />
          </el-form-item>
          <el-form-item label="初始密码">
            <el-input v-model="createForm.password" placeholder="默认 123456" />
          </el-form-item>
          <el-form-item label="企业名称" prop="enterpriseName">
            <el-input v-model="createForm.enterpriseName" />
          </el-form-item>
          <el-form-item label="统一社会信用代码" prop="creditCode">
            <el-input v-model="createForm.creditCode" maxlength="18" />
          </el-form-item>
          <el-form-item label="法人代表" prop="legalPerson">
            <el-input v-model="createForm.legalPerson" />
          </el-form-item>
          <el-form-item label="联系人" prop="contactName">
            <el-input v-model="createForm.contactName" />
          </el-form-item>
          <el-form-item label="联系人手机号" prop="contactPhone">
            <el-input v-model="createForm.contactPhone" maxlength="11" />
          </el-form-item>
          <el-form-item label="成立日期">
            <el-date-picker v-model="createForm.foundedAt" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="注册地址" prop="registerAddress" class="span-2">
            <el-input v-model="createForm.registerAddress" />
          </el-form-item>
          <el-form-item label="生产地址" class="span-2">
            <el-input v-model="createForm.productionAddress" />
          </el-form-item>
          <el-form-item label="供应商类型" prop="supplierType">
            <el-select v-model="createForm.supplierType">
              <el-option
                v-for="item in standardsStore.supplierTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="产品等级" prop="productLevel">
            <el-select v-model="createForm.productLevel">
              <el-option
                v-for="item in standardsStore.productLevels"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="注册资本">
            <el-input v-model="createForm.registeredCapital" />
          </el-form-item>
          <el-form-item label="经营范围" class="span-2">
            <el-input v-model="createForm.businessScope" type="textarea" :rows="3" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="creatingSupplier" @click="submitCreateSupplier">创建并进入代上传</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入存量供应商" width="1180px" append-to-body align-center>
      <div class="content-grid import-dialog-grid">
        <el-alert
          type="warning"
          :closable="false"
          title="当前为纯前端 Mock 导入：会模拟模板解析、字段映射、失败导出和建档写入，不会真实读取本地 Excel 内容。"
        />

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>1. 选择导入模板</h3>
              <p>上传任意 .xlsx / .xls / .csv 文件后，系统会加载一组 Mock 存量数据进行映射演示。</p>
            </div>
          </div>
          <div class="toolbar import-file-toolbar">
            <el-upload
              ref="importTemplateUploadRef"
              :auto-upload="false"
              :limit="1"
              :file-list="importTemplateFiles"
              accept=".xlsx,.xls,.csv"
              :on-change="handleImportTemplateChange"
              :on-remove="handleImportTemplateRemove"
            >
              <el-button type="primary" plain>选择导入模板</el-button>
            </el-upload>
            <el-tag :type="importTemplateFileName ? 'success' : 'info'">
              {{ importTemplateFileName || '尚未选择文件' }}
            </el-tag>
            <el-tag type="warning">总行数 {{ importPreviewSummary.total || importSourceRows.length }}</el-tag>
            <el-tag type="success">有效 {{ importPreviewSummary.valid }}</el-tag>
            <el-tag type="danger">失败 {{ importPreviewSummary.invalid }}</el-tag>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>2. 字段映射</h3>
              <p>可手动调整导入列与目标字段的映射关系，后续批次记录会保存映射摘要。</p>
            </div>
            <el-tag type="primary">{{ importPreviewSummary.mapped }}/{{ importTargetFields.length }} 已映射</el-tag>
          </div>
          <div class="mapping-grid">
            <div v-for="item in importTargetFields" :key="item.key" class="mapping-item">
              <span>{{ item.label }}<em v-if="item.required">*</em></span>
              <el-select v-model="importFieldMapping[item.key]" clearable placeholder="选择来源列">
                <el-option v-for="column in importColumnOptions" :key="column" :label="column" :value="column" />
              </el-select>
            </div>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>3. 可导入数据预览</h3>
              <p>这些记录会进入建档流程，并同步写入生命周期初始信息和电子档案来源。</p>
            </div>
            <el-tag type="success">{{ validImportRows.length }} 条可导入</el-tag>
          </div>
          <el-table :data="validImportRows" class="app-table" stripe>
            <el-table-column prop="rowNo" label="行号" width="70" />
            <el-table-column prop="enterpriseName" label="供应商名称" min-width="220" />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="190" />
            <el-table-column prop="supplierTypeLabel" label="供应商类型" min-width="150" />
            <el-table-column prop="productLevelLabel" label="产品等级" min-width="100" />
            <el-table-column label="生命周期" min-width="110">
              <template #default="{ row }">
                <el-tag :type="lifecycleTagType(row.lifecycleStatus)">{{ row.lifecycleLabel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="导入说明" min-width="240" />
          </el-table>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>4. 失败明细</h3>
              <p>失败记录不会进入建档，可先导出给管理员修正后重新导入。</p>
            </div>
            <div class="toolbar">
              <el-tag type="danger">{{ invalidImportRows.length }} 条失败</el-tag>
              <el-button plain @click="exportImportFailures">导出失败明细</el-button>
            </div>
          </div>
          <el-table :data="invalidImportRows" class="app-table" stripe>
            <el-table-column prop="rowNo" label="行号" width="70" />
            <el-table-column prop="enterpriseName" label="供应商名称" min-width="220" />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="190" />
            <el-table-column prop="reasonSummary" label="失败原因" min-width="320" />
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="importingSuppliers" @click="submitImportSuppliers">确认导入并建档</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="historyBackfillDialogVisible" title="回填历史审核记录" width="980px" append-to-body align-center>
      <div class="content-grid import-dialog-grid">
        <el-alert
          type="info"
          :closable="false"
          title="当前为 Mock 回填流程：先选择来源文件，再配置解析规则，系统会根据规则生成回填预览并写入电子档案、审核日志和生命周期日志。"
        />

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>1. 选择回填来源文件</h3>
              <p>支持上传 .xlsx / .xls / .csv 文件，当前会按所选文件名模拟一组历史审核台账供预览。</p>
            </div>
            <el-tag :type="historyTemplateFileName ? 'success' : 'info'">{{ historyTemplateFileName || '尚未选择文件' }}</el-tag>
          </div>
          <div class="toolbar import-file-toolbar">
            <el-upload
              ref="historyTemplateUploadRef"
              :auto-upload="false"
              :limit="1"
              :file-list="historyTemplateFiles"
              accept=".xlsx,.xls,.csv"
              :on-change="handleHistoryTemplateChange"
              :on-remove="handleHistoryTemplateRemove"
            >
              <el-button type="primary" plain>选择历史回填文件</el-button>
            </el-upload>
            <el-tag type="warning">原始记录 {{ historyBackfillPreviewSummary.total }}</el-tag>
            <el-tag type="success">可回填 {{ historyBackfillPreviewSummary.valid }}</el-tag>
            <el-tag type="info">规则过滤 {{ historyBackfillPreviewSummary.skipped }}</el-tag>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>2. 解析规则配置</h3>
              <p>用于决定回填台账按哪种列结构解析，以及哪些结论会写入电子档案。</p>
            </div>
            <el-tag type="primary">{{ historyBackfillRuleOption?.label || '--' }}</el-tag>
          </div>
          <div class="mapping-grid">
            <div class="mapping-item span-2">
              <span>解析规则</span>
              <el-radio-group v-model="historyBackfillRule.preset">
                <el-radio-button v-for="item in historyBackfillRuleOptions" :key="item.value" :label="item.value">
                  {{ item.label }}
                </el-radio-button>
              </el-radio-group>
            </div>
            <div class="mapping-item">
              <span>纳入有条件通过</span>
              <el-switch v-model="historyBackfillRule.includeConditional" />
            </div>
            <div class="mapping-item">
              <span>纳入未通过</span>
              <el-switch v-model="historyBackfillRule.includeRejected" />
            </div>
            <div class="mapping-item span-2">
              <span>保留原审核人</span>
              <el-switch v-model="historyBackfillRule.keepOriginalReviewer" />
            </div>
          </div>
          <div class="capsule-list" style="margin-top: 12px">
            <span v-for="item in historyBackfillParseConfigSummary" :key="item.label" class="capsule-item soft">
              {{ item.label }}：{{ item.value }}
            </span>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>3. 回填预览</h3>
              <p>确认后会按以下记录批量回填到当前供应商的电子档案中。</p>
            </div>
            <el-tag type="primary">{{ historyBackfillCandidates.length }} 条记录</el-tag>
          </div>
          <el-table :data="historyBackfillCandidates" class="app-table" stripe>
            <el-table-column prop="historyPeriod" label="历史期间" min-width="150" />
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column label="文件类型" min-width="150">
              <template #default="{ row }">{{ documentTypeLabel(row.category) }}</template>
            </el-table-column>
            <el-table-column label="审核结论" min-width="120">
              <template #default="{ row }">
                <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'conditional' ? 'warning' : 'danger'">
                  {{ historyStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reviewerName" label="审核人" min-width="140" />
            <el-table-column label="审核时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.reviewedAt) }}</template>
            </el-table-column>
            <el-table-column prop="opinion" label="审核意见" min-width="260" />
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="historyBackfillDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="backfillingHistory" @click="submitHistoryBackfill">确认回填</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="batchDetailVisible" :title="batchDetailTitle" size="52%" append-to-body>
      <div v-if="batchDetailType === 'import' && selectedImportBatch" class="content-grid">
        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>批次摘要</h3>
              <p>查看导入来源文件、成功失败统计和本次导入范围。</p>
            </div>
          </div>
          <div class="metric-row">
            <span>来源文件</span>
            <strong>{{ selectedImportBatch.sourceFileName || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>导入时间</span>
            <strong>{{ formatDateTime(selectedImportBatch.importedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>操作人</span>
            <strong>{{ selectedImportBatch.operatorName }}</strong>
          </div>
          <div class="metric-row">
            <span>总行数</span>
            <strong>{{ selectedImportBatch.total }}</strong>
          </div>
          <div class="metric-row">
            <span>成功数</span>
            <strong>{{ selectedImportBatch.successCount }}</strong>
          </div>
          <div class="metric-row">
            <span>失败/跳过</span>
            <strong>{{ selectedImportBatch.failureCount }}</strong>
          </div>
          <div class="metric-row">
            <span>导入说明</span>
            <strong>{{ selectedImportBatch.note || '--' }}</strong>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>字段映射摘要</h3>
              <p>保留本次导入时的目标字段与来源列映射，便于后续核对模板。</p>
            </div>
          </div>
          <el-table :data="selectedImportBatch.mappingSummary || []" class="app-table" stripe>
            <el-table-column prop="target" label="目标字段" min-width="160" />
            <el-table-column label="来源列" min-width="180">
              <template #default="{ row }">{{ row.source || '--' }}</template>
            </el-table-column>
            <el-table-column label="是否必填" min-width="100">
              <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>导入供应商</h3>
              <p>本批次成功建立电子档案的供应商列表。</p>
            </div>
          </div>
          <div class="capsule-list">
            <span
              v-for="name in selectedImportBatch.supplierNames || []"
              :key="`${selectedImportBatch.id}-${name}`"
              class="capsule-item"
            >
              {{ name }}
            </span>
            <span v-if="!(selectedImportBatch.supplierNames || []).length" class="status-text">暂无</span>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>关联回填批次</h3>
              <p>根据本批次涉及的供应商，快速跳转查看后续历史回填记录。</p>
            </div>
          </div>
          <el-table :data="relatedHistoryBatchRows" class="app-table" stripe>
            <el-table-column prop="batchNo" label="回填批次" min-width="180" />
            <el-table-column prop="supplierName" label="供应商" min-width="220" />
            <el-table-column label="来源文件" min-width="180">
              <template #default="{ row }">{{ row.sourceFileName || '--' }}</template>
            </el-table-column>
            <el-table-column label="回填时间" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.backfilledAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="openHistoryBackfillBatchDetail(row)">查看回填</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>失败明细回看</h3>
              <p>回看导入失败或跳过原因，便于后续补数据。</p>
            </div>
          </div>
          <el-table :data="selectedImportBatch.failureDetails || []" class="app-table" stripe>
            <el-table-column prop="rowNo" label="行号" width="70" />
            <el-table-column prop="enterpriseName" label="供应商名称" min-width="220" />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="190" />
            <el-table-column prop="reason" label="失败原因" min-width="260" />
            <el-table-column label="字段" min-width="120">
              <template #default="{ row }">{{ row.field || '--' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div v-else-if="batchDetailType === 'history' && selectedHistoryBackfillBatch" class="content-grid">
        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>回填批次摘要</h3>
              <p>查看历史审核回填来源、结论分布和补录规模。</p>
            </div>
          </div>
          <div class="metric-row">
            <span>供应商</span>
            <strong>{{ selectedHistoryBackfillBatch.supplierName }}</strong>
          </div>
          <div class="metric-row">
            <span>来源文件</span>
            <strong>{{ selectedHistoryBackfillBatch.sourceFileName || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>解析规则</span>
            <strong>{{ selectedHistoryBackfillBatch.parseRuleName || '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>回填时间</span>
            <strong>{{ formatDateTime(selectedHistoryBackfillBatch.backfilledAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>操作人</span>
            <strong>{{ selectedHistoryBackfillBatch.operatorName }}</strong>
          </div>
          <div class="metric-row">
            <span>回填条数</span>
            <strong>{{ selectedHistoryBackfillBatch.total }}</strong>
          </div>
          <div class="metric-row">
            <span>过滤条数</span>
            <strong>{{ selectedHistoryBackfillBatch.failureCount || 0 }}</strong>
          </div>
          <div class="metric-row">
            <span>结论分布</span>
            <strong>
              通过 {{ selectedHistoryBackfillBatch.approvedCount }} /
              有条件通过 {{ selectedHistoryBackfillBatch.conditionalCount }} /
              未通过 {{ selectedHistoryBackfillBatch.rejectedCount }}
            </strong>
          </div>
          <div class="metric-row">
            <span>备注</span>
            <strong>{{ selectedHistoryBackfillBatch.note || '--' }}</strong>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>解析规则摘要</h3>
              <p>回看本次历史回填使用的来源文件配置与写入范围。</p>
            </div>
          </div>
          <div class="capsule-list">
            <span
              v-for="item in selectedHistoryBackfillBatch.parseConfigSummary || []"
              :key="`${selectedHistoryBackfillBatch.id}-${item.label}`"
              class="capsule-item soft"
            >
              {{ item.label }}：{{ item.value }}
            </span>
          </div>
          <div v-if="selectedHistoryBackfillBatch.sourceFileMeta" class="mini-section">
            <span>来源文件统计</span>
            <div class="capsule-list">
              <span class="capsule-item">总行数 {{ selectedHistoryBackfillBatch.sourceFileMeta.rowCount || 0 }}</span>
              <span class="capsule-item">写入 {{ selectedHistoryBackfillBatch.sourceFileMeta.validCount || selectedHistoryBackfillBatch.total || 0 }}</span>
              <span class="capsule-item soft">过滤 {{ selectedHistoryBackfillBatch.sourceFileMeta.skippedCount || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>关联导入批次</h3>
              <p>根据本次回填的供应商，快速跳转查看最初建档的导入批次。</p>
            </div>
          </div>
          <el-table :data="relatedImportBatchRows" class="app-table" stripe>
            <el-table-column prop="batchNo" label="导入批次" min-width="180" />
            <el-table-column label="来源文件" min-width="180">
              <template #default="{ row }">{{ row.sourceFileName || '--' }}</template>
            </el-table-column>
            <el-table-column label="导入时间" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.importedAt) }}</template>
            </el-table-column>
            <el-table-column label="导入供应商" min-width="220">
              <template #default="{ row }">{{ row.supplierNames?.join('、') || '--' }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="openImportBatchDetail(row)">查看导入</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>回填材料范围</h3>
              <p>查看本次历史回填涉及的材料类型和文件名称。</p>
            </div>
          </div>
          <div class="mini-section">
            <span>材料类型</span>
            <div class="capsule-list">
              <span
                v-for="category in selectedHistoryBackfillBatch.categories || []"
                :key="`${selectedHistoryBackfillBatch.id}-${category}`"
                class="capsule-item"
              >
                {{ documentTypeLabel(category) }}
              </span>
            </div>
          </div>
          <div class="mini-section">
            <span>文件名称</span>
            <div class="capsule-list">
              <span
                v-for="name in selectedHistoryBackfillBatch.recordNames || []"
                :key="`${selectedHistoryBackfillBatch.id}-${name}`"
                class="capsule-item soft"
              >
                {{ name }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="(selectedHistoryBackfillBatch.failureDetails || []).length" class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>过滤记录说明</h3>
              <p>展示本次因解析规则过滤而未写入电子档案的记录说明。</p>
            </div>
          </div>
          <el-table :data="selectedHistoryBackfillBatch.failureDetails || []" class="app-table" stripe>
            <el-table-column prop="rowNo" label="来源" min-width="100" />
            <el-table-column prop="enterpriseName" label="供应商名称" min-width="220" />
            <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" />
            <el-table-column prop="reason" label="过滤原因" min-width="280" />
          </el-table>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>回填记录明细</h3>
              <p>直接回看本次补录进电子档案的历史审核记录。</p>
            </div>
          </div>
          <el-table :data="selectedHistoryBackfillRecordRows" class="app-table" stripe>
            <el-table-column prop="historyPeriod" label="历史期间" min-width="150" />
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column label="文件类型" min-width="150">
              <template #default="{ row }">{{ documentTypeLabel(row.category) }}</template>
            </el-table-column>
            <el-table-column label="审核结论" min-width="120">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="审核人" min-width="120">
              <template #default="{ row }">{{ row.reviewerName || '--' }}</template>
            </el-table-column>
            <el-table-column label="审核时间" min-width="160">
              <template #default="{ row }">{{ row.reviewedAt ? formatDateTime(row.reviewedAt) : '--' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.top-toolbar {
  margin-bottom: 16px;
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.showcase-wrapper,
.showcase-panel,
.table-card,
.upload-card,
.inner-card {
  padding: 20px;
}

.showcase-wrapper :deep(.el-collapse) {
  border-top: none;
  border-bottom: none;
}

.showcase-wrapper :deep(.el-collapse-item__header) {
  font-weight: 600;
  color: var(--brand-deep);
}

.showcase-wrapper :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.showcase-wrapper :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.table-card {
  overflow: hidden;
}

.upload-card + .upload-card {
  margin-top: 16px;
}

.panel-title {
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.template-showcase-list,
.batch-list,
.timeline-list {
  display: grid;
  gap: 12px;
}

.template-showcase-item,
.batch-item,
.mapping-item,
.timeline-item {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.86);
}

.template-showcase-head,
.batch-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.template-showcase-item p,
.batch-item p,
.timeline-item p {
  margin: 8px 0 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.timeline-item span,
.batch-time {
  color: var(--text-muted);
  font-size: 12px;
}

.mini-section + .mini-section {
  margin-top: 10px;
}

.mini-section span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.batch-time {
  display: block;
  margin-top: 10px;
}

.create-form-grid,
.mapping-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mapping-item {
  display: grid;
  gap: 10px;
}

.mapping-item span {
  font-size: 14px;
  font-weight: 600;
}

.mapping-item em {
  color: var(--danger);
  font-style: normal;
  margin-left: 4px;
}

.import-dialog-grid {
  gap: 14px;
}

.import-file-toolbar {
  align-items: center;
  flex-wrap: wrap;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 1200px) {
  .archive-grid,
  .showcase-grid,
  .mapping-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .archive-grid,
  .showcase-grid,
  .create-form-grid,
  .mapping-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}
</style>



