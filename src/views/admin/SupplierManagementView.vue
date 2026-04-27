<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
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
const drawerVisible = ref(false)
const createDialogVisible = ref(false)
const importDialogVisible = ref(false)
const currentSupplierId = ref('')
const tab = ref('profile')
const adminUploading = ref(false)
const creatingSupplier = ref(false)
const importingSuppliers = ref(false)
const uploadRef = ref(null)
const uploadFileList = ref([])
const createFormRef = ref(null)
const showcaseOpen = ref([])
const selectedImportIds = ref([])

const importCandidates = [
  {
    id: 'legacy-001',
    enterpriseName: '华星钣金制造（天津）有限公司',
    creditCode: '91120116MA06Q7D95K',
    legalPerson: '陈拓',
    contactName: '吕青',
    contactPhone: '13377889911',
    registerAddress: '天津市滨海新区智造港 6 号',
    productionAddress: '天津市滨海新区装备园 3 号厂房',
    foundedAt: '2017-11-08',
    registeredCapital: '2600 万人民币',
    businessScope: '精密钣金件、焊接件、模组结构件制造与交付',
    supplierType: 'parts',
    productLevel: 'B',
    templateId: 'std-parts-b-v2',
    lifecycleStatus: 'active',
    latestReviewTrigger: '历史档案导入完成，等待年度复评',
    tags: ['存量导入', '历史合格供应商'],
    note: '历史审核记录完整，可直接建立电子档案。',
  },
  {
    id: 'legacy-002',
    enterpriseName: '北斗智运仓配（武汉）有限公司',
    creditCode: '91420100MA4KX5T62P',
    legalPerson: '韩策',
    contactName: '顾航',
    contactPhone: '13255668899',
    registerAddress: '武汉市东湖高新区光谷大道 58 号',
    productionAddress: '武汉市江夏区周转仓 8 号',
    foundedAt: '2018-06-19',
    registeredCapital: '1400 万人民币',
    businessScope: '周转配送、仓配协同、物流包装器具维护',
    supplierType: 'transport',
    productLevel: 'C',
    templateId: 'std-transport-c-v1',
    lifecycleStatus: 'watch',
    latestReviewTrigger: '临期证书已纳入季度复审',
    tags: ['存量导入', '证书临期'],
    note: '存在证书临期记录，导入后纳入重点观察。',
  },
  {
    id: 'legacy-003',
    enterpriseName: '星链工业服务（成都）有限公司',
    creditCode: '91510100MA67W3P41N',
    legalPerson: '梁非',
    contactName: '穆然',
    contactPhone: '13144556677',
    registerAddress: '成都市高新区天府三街 199 号',
    productionAddress: '成都市双流区园区运维中心 2 层',
    foundedAt: '2020-03-12',
    registeredCapital: '1100 万人民币',
    businessScope: '驻场运维、综合服务、环保配套支持',
    supplierType: 'other',
    productLevel: 'C',
    templateId: 'std-other-c-v1',
    lifecycleStatus: 'frozen',
    latestReviewTrigger: '证书过期，待更新后重审',
    tags: ['存量导入', '冻结观察'],
    note: '历史档案显示证书过期，导入后保持冻结状态。',
  },
]

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
    { pattern: /^[0-9A-Z]{18}$/, message: '统一社会信用代码应为 18 位大写字母/数字', trigger: 'blur' },
  ],
  legalPerson: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系人手机号', trigger: 'blur' },
    { pattern: /^1\\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' },
  ],
  registerAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  supplierType: [{ required: true, message: '请选择供应商类型', trigger: 'change' }],
  productLevel: [{ required: true, message: '请选择产品等级', trigger: 'change' }],
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
      return {
        ...item,
        filesCount: records.length,
        approvedCount: records.filter((record) => record.status === 'approved').length,
        riskCount: riskRecords.length,
        notifiedCount: notifications.length,
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
const replaceableRecords = computed(() =>
  currentRecords.value.filter((item) => item.category === uploadForm.category).slice(0, 12),
)
const templateShowcases = computed(() =>
  standardsStore.activeTemplates.slice(0, 6).map((item) => ({
    ...item,
    supplierTypeLabel: standardsStore.supplierTypes.find((option) => option.value === item.supplierType)?.label || item.supplierType,
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
const selectedImportRows = computed(() => importCandidates.filter((item) => selectedImportIds.value.includes(item.id)))

function documentTypeLabel(value) {
  return standardsStore.documentTypes.find((item) => item.value === value)?.label || value
}

function openDrawer(row, initialTab = 'profile') {
  currentSupplierId.value = row.id
  drawerVisible.value = true
  tab.value = initialTab
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

function lifecycleTagType(value) {
  return value === 'frozen' ? 'danger' : value === 'watch' ? 'warning' : 'success'
}

function lifecycleLabel(value) {
  return value === 'frozen' ? '已冻结' : value === 'watch' ? '重点观察' : '正常'
}

function openImportDialog() {
  selectedImportIds.value = []
  importDialogVisible.value = true
}

function sendNotification(row) {
  try {
    reviewsStore.sendRiskNotification({
      recordId: row.id,
      operatorName: authStore.displayName,
      trigger: 'manual',
      mode: 'manual',
    })
    ElMessage.success('已向供应商发送短信提醒。')
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
  if (file.raw) {
    return URL.createObjectURL(file.raw)
  }
  return ''
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
      ElMessage.success(`已创建供应商档案，默认密码为 ${createForm.password}。`)
      openDrawer(supplier, 'upload')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      creatingSupplier.value = false
    }
  }, 500)
}

function handleImportSelectionChange(rows) {
  selectedImportIds.value = rows.map((item) => item.id)
}

function submitImportSuppliers() {
  importingSuppliers.value = true

  setTimeout(() => {
    try {
      const result = suppliersStore.importSuppliersByAdmin({
        items: selectedImportRows.value,
        operatorName: authStore.displayName,
        note: '通过管理员批量导入建立存量供应商电子档案',
      })
      importDialogVisible.value = false
      ElMessage.success(`已导入 ${result.importedSuppliers.length} 家存量供应商，并建立电子档案。`)
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
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商管理</h1>
        <p>查看供应商档案、文件风险与通知记录，并支持管理员代上传供应商电子档案，实现集中管理。</p>
      </div>
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input
          v-model="keywordInput"
          placeholder="搜索企业名称或统一社会信用代码"
          clearable
          style="max-width: 280px"
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
          <el-table-column prop="enterprise.creditCode" label="统一社会信用代码" min-width="180" />
          <el-table-column label="供应商类型" min-width="180">
            <template #default="{ row }">
              {{ standardsStore.supplierTypes.find((item) => item.value === row.enterprise.supplierType)?.label }}
            </template>
          </el-table-column>
          <el-table-column prop="filesCount" label="上传文件数" min-width="110" />
          <el-table-column prop="approvedCount" label="已通过数" min-width="110" />
          <el-table-column prop="riskCount" label="风险文件数" min-width="110" />
          <el-table-column prop="notifiedCount" label="通知次数" min-width="110" />
          <el-table-column label="档案来源" min-width="130">
            <template #default="{ row }">
              {{ row.lifecycle.archiveSource === 'batch-import' ? '批量导入' : row.lifecycle.archiveSource === 'admin-created' ? '管理员建档' : '供应商注册' }}
            </template>
          </el-table-column>
          <el-table-column label="生命周期" min-width="120">
            <template #default="{ row }">
              <el-tag :type="lifecycleTagType(row.lifecycle.status)">{{ lifecycleLabel(row.lifecycle.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="入驻时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.registeredAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="200" fixed="right">
            <template #default="{ row }">
              <div class="toolbar">
                <el-button text type="primary" @click="openDrawer(row, 'profile')">查看档案</el-button>
                <el-button text type="warning" @click="openDrawer(row, 'upload')">代上传文件</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="section-card showcase-wrapper">
      <div class="panel-title">
        <div>
          <h3>Mock 示例区</h3>
          <p>这部分不再挡在主操作区前面，平时可以收起，需要演示时再展开。</p>
        </div>
      </div>
      <el-collapse v-model="showcaseOpen">
        <el-collapse-item title="查看材料组合、批量代上传和批量通知示例" name="mock-showcases">
          <div class="showcase-grid">
            <div class="section-card showcase-panel">
              <div class="panel-title">
                <div>
                  <h3>供应商类型材料组合示例</h3>
                  <p>把不同供应商类型和准入模板需要的材料直接展示出来，方便 mock 演示时快速切换场景。</p>
                </div>
                <el-tag type="success">{{ templateShowcases.length }} 套模板</el-tag>
              </div>
              <div class="template-showcase-list">
                <div v-for="item in templateShowcases" :key="item.id" class="template-showcase-item">
                  <div class="template-showcase-head">
                    <strong>{{ item.name }}</strong>
                    <el-tag>{{ item.supplierTypeLabel }}</el-tag>
                  </div>
                  <p>{{ item.productLevel }} 级准入 · 门槛 {{ item.threshold }} 分</p>
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
                  <p>展示管理员为多家供应商集中补档的 mock 批次，便于验证后台集中管理路径。</p>
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
                  <p>模拟管理员一键向多家供应商发送风险通知，便于验证通知批次、级别和覆盖面。</p>
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

    <div class="section-card showcase-wrapper">
      <div class="panel-title">
        <div>
          <h3>批量导入记录</h3>
          <p>保留最近的存量供应商导入批次，方便后续追溯是通过哪次导入建立电子档案。</p>
        </div>
      </div>
      <el-table :data="importBatchRows" class="app-table" stripe>
        <el-table-column prop="batchNo" label="导入批次" min-width="180" />
        <el-table-column label="导入时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.importedAt) }}</template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" min-width="120" />
        <el-table-column prop="successCount" label="成功数" min-width="90" />
        <el-table-column prop="skippedCount" label="跳过数" min-width="90" />
        <el-table-column label="导入供应商" min-width="280">
          <template #default="{ row }">{{ row.supplierNames.join('、') || '--' }}</template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawerVisible" :title="currentSupplier?.enterprise.enterpriseName" size="60%" append-to-body>
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
            <span>经营范围</span>
            <strong>{{ currentSupplier?.enterprise.businessScope }}</strong>
          </div>
        </el-tab-pane>

        <el-tab-pane label="电子档案" name="archive">
          <div class="content-grid archive-grid">
            <div class="section-card upload-card">
              <div class="panel-title">
                <div>
                  <h3>档案摘要</h3>
                  <p>集中查看存量导入来源、生命周期状态和当前归档情况。</p>
                </div>
                <el-tag :type="lifecycleTagType(currentLifecycle.status)">{{ lifecycleLabel(currentLifecycle.status) }}</el-tag>
              </div>
              <div class="metric-row">
                <span>档案来源</span>
                <strong>{{ currentLifecycle.archiveSource === 'batch-import' ? '批量导入' : currentLifecycle.archiveSource === 'admin-created' ? '管理员建档' : '供应商注册' }}</strong>
              </div>
              <div class="metric-row">
                <span>登录账号</span>
                <strong>{{ currentSupplier?.account }}</strong>
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
                <span>冻结原因</span>
                <strong>{{ currentLifecycle.freezeReason || '--' }}</strong>
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
                  <p>优先展示已通过和已归档文件，便于快速判断历史资质沉淀情况。</p>
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
                <el-table-column label="归档状态" min-width="110">
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
                <h3>生命周期日志</h3>
                <p>记录导入建档、冻结、重点观察、重审触发等关键动作。</p>
              </div>
            </div>
            <div v-if="(currentLifecycle.lifecycleLogs || []).length" class="timeline-list">
              <div v-for="item in currentLifecycle.lifecycleLogs" :key="item.id" class="timeline-item">
                <strong>{{ item.action }}</strong>
                <span>{{ item.actor }} · {{ formatDateTime(item.at) }}</span>
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
            <el-table-column label="告警类别" min-width="240">
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
                {{ row.uploadSource === 'admin' ? '管理员代上传' : '供应商上传' }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="管理员代上传" name="upload">
          <div class="section-card upload-card">
            <div class="panel-title">
              <div>
                <h3>代上传供应商文件</h3>
                <p>用于集中维护供应商电子档案。提交后仍会进入机器预审核，高风险文件会自动触发短信提醒。</p>
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
                <el-select v-model="uploadForm.reuploadOf" clearable placeholder="选择后将按更新文件处理">
                  <el-option
                    v-for="item in replaceableRecords"
                    :key="item.id"
                    :label="`${item.fileName}｜${item.status === 'approved' ? '已通过' : item.status === 'conditional' ? '有条件通过' : item.status === 'rejected' ? '未通过' : '审核中'}`"
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
          <el-form-item label="法人" prop="legalPerson">
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

    <el-dialog v-model="importDialogVisible" title="批量导入存量供应商" width="920px" append-to-body align-center>
      <div class="content-grid">
        <el-alert
          type="warning"
          :closable="false"
          title="当前为纯前端 Mock 导入：会直接建立供应商账号和电子档案，不会真的解析 Excel。"
        />
        <el-table :data="importCandidates" class="app-table" stripe @selection-change="handleImportSelectionChange">
          <el-table-column type="selection" width="52" />
          <el-table-column prop="enterpriseName" label="供应商名称" min-width="220" />
          <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" />
          <el-table-column label="供应商类型" min-width="140">
            <template #default="{ row }">
              {{ standardsStore.supplierTypes.find((item) => item.value === row.supplierType)?.label }}
            </template>
          </el-table-column>
          <el-table-column label="生命周期" min-width="120">
            <template #default="{ row }">
              <el-tag :type="lifecycleTagType(row.lifecycleStatus)">{{ lifecycleLabel(row.lifecycleStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="note" label="导入说明" min-width="280" />
        </el-table>
        <div class="section-card upload-card">
          <div class="panel-title">
            <div>
              <h3>本次导入预览</h3>
              <p>导入后将自动建立账号、电子档案和生命周期初始记录。</p>
            </div>
            <el-tag type="success">{{ selectedImportRows.length }} 家</el-tag>
          </div>
          <div class="capsule-list">
            <span v-for="item in selectedImportRows" :key="item.id" class="capsule-item">{{ item.enterpriseName }}</span>
            <span v-if="!selectedImportRows.length" class="status-text">请先勾选要导入的供应商</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="importingSuppliers" @click="submitImportSuppliers">确认导入并建档</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
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
.upload-card {
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

.timeline-list {
  display: grid;
  gap: 12px;
}

.timeline-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.timeline-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.timeline-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.template-showcase-list,
.batch-list {
  display: grid;
  gap: 12px;
}

.template-showcase-item,
.batch-item {
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
.batch-item p {
  margin: 8px 0 12px;
  color: var(--text-secondary);
  line-height: 1.6;
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
  color: var(--text-muted);
  font-size: 12px;
}

.create-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 1200px) {
  .archive-grid,
  .showcase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .archive-grid,
  .showcase-grid {
    grid-template-columns: 1fr;
  }

  .create-form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}
</style>
