<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import { formatDateTime, formatPhone, normalizeKeyword } from '../../utils/format'

const authStore = useAuthStore()
const suppliersStore = useSuppliersStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const keywordInput = ref('')
const keyword = ref('')
const drawerVisible = ref(false)
const createDialogVisible = ref(false)
const currentSupplierId = ref('')
const tab = ref('profile')
const adminUploading = ref(false)
const creatingSupplier = ref(false)
const uploadRef = ref(null)
const uploadFileList = ref([])
const createFormRef = ref(null)

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
const currentAdminUploads = computed(() =>
  currentRecords.value.filter((item) => item.uploadSource === 'admin').slice(0, 8),
)
const replaceableRecords = computed(() =>
  currentRecords.value.filter((item) => item.category === uploadForm.category).slice(0, 12),
)

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

    <el-drawer v-model="drawerVisible" :title="currentSupplier?.enterprise.enterpriseName" size="60%">
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
                <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">
                  {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '未通过' : '审核中' }}
                </el-tag>
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
                    :label="`${item.fileName}｜${item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '未通过' : '审核中'}`"
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

    <el-dialog v-model="createDialogVisible" title="新增供应商" width="760px">
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
  </div>
</template>

<style scoped>
.table-card,
.upload-card {
  padding: 20px;
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

.create-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .create-form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}
</style>
