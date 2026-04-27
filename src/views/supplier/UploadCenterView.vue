<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import MachineBadge from '../../components/MachineBadge.vue'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDate, formatDateTime } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const activeTab = ref(route.query.reupload ? 'upload' : 'renewal')
const uploading = ref(false)
const updating = ref(false)
const updateDialogVisible = ref(false)
const uploadRef = ref(null)
const updateUploadRef = ref(null)
const fileList = ref([])
const updateFileList = ref([])
const selectedUpdateRecord = ref(null)

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
const allRecords = computed(() => reviewsStore.recordsBySupplier(authStore.userId))
const renewalRecords = computed(() => reviewsStore.renewalRecordsBySupplier(authStore.userId))
const recentRecords = computed(() => allRecords.value.slice(0, 5))

const form = reactive({
  category: route.query.category || 'business-license',
})

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

function handleChange(_, files) {
  fileList.value = files.filter((file) => !file.raw || validateRawFile(file.raw))
}

function handleUpdateChange(_, files) {
  updateFileList.value = files.filter((file) => !file.raw || validateRawFile(file.raw))
}

function buildPreviewUrl(file) {
  if (file.raw) {
    return URL.createObjectURL(file.raw)
  }
  return ''
}

function handleRemove(_, files) {
  fileList.value = files
}

function handleUpdateRemove(_, files) {
  updateFileList.value = files
}

function resetSelection() {
  fileList.value = []
  uploadRef.value?.clearFiles()
}

function resetUpdateSelection() {
  updateFileList.value = []
  updateUploadRef.value?.clearFiles()
}

function normalizeFiles(files) {
  return files.map((file) => ({
    name: file.name,
    type: file.raw?.type || file.raw?.mime || '',
    size: file.size,
    previewUrl: buildPreviewUrl(file),
  }))
}

function submitUpload() {
  uploading.value = true
  setTimeout(() => {
    try {
      const records = reviewsStore.uploadDocuments({
        supplierId: authStore.userId,
        category: form.category,
        reuploadOf: String(route.query.reupload || ''),
        files: normalizeFiles(fileList.value),
      })
      ElMessage.success(`已完成 ${records.length} 份文件上传，并进入机器预审核。`)
      resetSelection()
      router.replace('/supplier/upload')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      uploading.value = false
    }
  }, 800)
}

function openUpdateWindow(record) {
  selectedUpdateRecord.value = record
  updateDialogVisible.value = true
  resetUpdateSelection()
}

function submitUpdate() {
  if (!selectedUpdateRecord.value) return
  updating.value = true

  setTimeout(() => {
    try {
      const records = reviewsStore.uploadDocuments({
        supplierId: authStore.userId,
        category: selectedUpdateRecord.value.category,
        reuploadOf: selectedUpdateRecord.value.id,
        files: normalizeFiles(updateFileList.value),
      })
      ElMessage.success(`已提交 ${records.length} 份更新文件，状态已重置为审核中。`)
      updateDialogVisible.value = false
      resetUpdateSelection()
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      updating.value = false
    }
  }, 800)
}

function renewalTagType(level) {
  if (level === 'expired' || level === 'rejected' || level === 'urgent-expiring') return 'danger'
  if (level === 'expiring') return 'warning'
  return 'success'
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>文件管理</h1>
        <p>统一上传资质文件、查看更细化的告警状态，并跟进临期、过期、退回补传等风险文件。</p>
      </div>
      <el-button type="primary" @click="activeTab = 'upload'">上传资质文件</el-button>
    </div>

    <div class="stat-grid">
      <div class="section-card file-stat">
        <span>全部文件</span>
        <strong>{{ allRecords.length }}</strong>
        <p>当前企业所有资质与审核记录</p>
      </div>
      <div class="section-card file-stat danger">
        <span>需优先处理</span>
        <strong>{{ renewalRecords.length }}</strong>
        <p>包含临期加急、已过期、退回补传和待核实文件</p>
      </div>
      <div class="section-card file-stat">
        <span>准入模板</span>
        <strong>{{ currentTemplate?.version }}</strong>
        <p>{{ currentTemplate?.name }}</p>
      </div>
    </div>

    <div class="section-card manager-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="需更新文件" name="renewal">
          <el-alert
            type="warning"
            :closable="false"
            title="高风险、临期和退回补传文件会自动触发短信提醒，管理员端也会同步看到相应风险。"
            style="margin-bottom: 16px"
          />
          <el-table :data="renewalRecords" class="app-table" stripe>
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column label="文件类型" min-width="160">
              <template #default="{ row }">
                {{ standardsStore.documentTypes.find((item) => item.value === row.category)?.label }}
              </template>
            </el-table-column>
            <el-table-column label="有效期" min-width="120">
              <template #default="{ row }">{{ formatDate(row.extractedFields.validUntil) }}</template>
            </el-table-column>
            <el-table-column label="更新状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="renewalTagType(row.renewalState.level)">
                  {{ row.renewalState.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="风险状态" min-width="140">
              <template #default="{ row }">
                <RiskStatusTag :status="row.riskStatus" />
              </template>
            </el-table-column>
            <el-table-column label="告警类别" min-width="240">
              <template #default="{ row }">{{ row.riskAlerts.map((item) => item.label).join('、') }}</template>
            </el-table-column>
            <el-table-column prop="renewalState.reason" label="原因" min-width="260" />
            <el-table-column label="操作" min-width="180" fixed="right">
              <template #default="{ row }">
                <div class="toolbar">
                  <el-button text type="primary" @click="$router.push(`/supplier/records/${row.id}`)">详情</el-button>
                  <el-button text type="danger" @click="openUpdateWindow(row)">更新文件</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!renewalRecords.length" class="rich-empty">当前没有需要更新的文件。</div>
        </el-tab-pane>

        <el-tab-pane label="新增上传" name="upload">
          <div class="content-grid two-col">
            <div class="upload-panel">
              <div class="panel-title">
                <h3>上传资质文件</h3>
                <el-tag type="warning">单文件 ≤ 20MB</el-tag>
              </div>
              <el-alert
                v-if="route.query.reupload"
                type="warning"
                :closable="false"
                title="当前为未通过文件的重新上传，提交后状态会重置为“审核中”。"
                style="margin-bottom: 16px"
              />
              <el-form label-position="top">
                <el-form-item label="文件类型">
                  <el-select v-model="form.category">
                    <el-option
                      v-for="item in standardsStore.documentTypes"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="当前准入模板">
                  <el-input :model-value="currentTemplate?.name" disabled />
                </el-form-item>
                <el-upload
                  ref="uploadRef"
                  drag
                  multiple
                  :auto-upload="false"
                  :file-list="fileList"
                  :before-upload="beforeUpload"
                  :on-change="handleChange"
                  :on-remove="handleRemove"
                >
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">将文件拖到此处，或 <em>点击选择文件</em></div>
                  <template #tip>
                    <div class="status-text">
                      支持 PDF、PNG、JPG。同类型生效文件禁止重复上传，如需替换请在“需更新文件”中处理。
                    </div>
                  </template>
                </el-upload>
              </el-form>
              <div class="toolbar" style="margin-top: 18px">
                <el-button type="primary" :loading="uploading" @click="submitUpload">上传并触发预审核</el-button>
                <el-button plain @click="resetSelection">清空所选</el-button>
              </div>
            </div>

            <div class="upload-panel soft">
              <div class="panel-title">
                <h3>状态说明</h3>
              </div>
              <div class="metric-row">
                <span>模拟状态</span>
                <strong>正常归档 / 跟进观察 / 重点关注 / 高风险待处理 / 紧急处理</strong>
              </div>
              <div class="metric-row">
                <span>准入门槛</span>
                <strong>{{ currentTemplate?.threshold }} 分</strong>
              </div>
              <div class="metric-row">
                <span>必传材料组合</span>
                <strong>{{ (currentTemplate?.requiredDocuments || []).map((item) => standardsStore.documentTypes.find((doc) => doc.value === item)?.label || item).join(' / ') || '待配置' }}</strong>
              </div>
              <div class="metric-row">
                <span>推荐补充材料</span>
                <strong>{{ (currentTemplate?.recommendedDocuments || []).map((item) => standardsStore.documentTypes.find((doc) => doc.value === item)?.label || item).join(' / ') || '无' }}</strong>
              </div>
              <div class="metric-row">
                <span>一票否决</span>
                <strong>{{ currentTemplate?.vetoRules?.join('；') || '无' }}</strong>
              </div>
              <div class="metric-row">
                <span>最近上传</span>
                <strong>{{ recentRecords[0]?.fileName || '暂无' }}</strong>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="全部文件" name="files">
          <el-table :data="allRecords" class="app-table" stripe>
            <el-table-column prop="fileName" label="文件名称" min-width="220" />
            <el-table-column label="文件类型" min-width="160">
              <template #default="{ row }">
                {{ standardsStore.documentTypes.find((item) => item.value === row.category)?.label }}
              </template>
            </el-table-column>
            <el-table-column label="上传时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
            </el-table-column>
            <el-table-column label="有效期" min-width="120">
              <template #default="{ row }">{{ formatDate(row.extractedFields.validUntil) }}</template>
            </el-table-column>
            <el-table-column label="机器核验" min-width="150">
              <template #default="{ row }">
                <MachineBadge :status="row.machineStatus" :score="row.precheckScore" />
              </template>
            </el-table-column>
            <el-table-column label="审核状态" min-width="110">
              <template #default="{ row }">
                <StatusTag :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column label="风险状态" min-width="140">
              <template #default="{ row }">
                <RiskStatusTag :status="row.riskStatus" />
              </template>
            </el-table-column>
            <el-table-column label="短信状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="row.notificationState.type">{{ row.notificationState.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="200" fixed="right">
              <template #default="{ row }">
                <div class="toolbar">
                  <el-button text type="primary" @click="$router.push(`/supplier/records/${row.id}`)">详情</el-button>
                  <el-button
                    v-if="reviewsStore.getRenewalState(row).needUpdate"
                    text
                    type="danger"
                    @click="openUpdateWindow(row)"
                  >
                    更新文件
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="updateDialogVisible" title="更新资质文件" width="620px">
      <el-alert
        type="warning"
        :closable="false"
        :title="selectedUpdateRecord?.renewalState?.reason || '请选择新文件后提交更新。'"
        style="margin-bottom: 16px"
      />
      <div class="metric-row">
        <span>原文件</span>
        <strong>{{ selectedUpdateRecord?.fileName }}</strong>
      </div>
      <div class="metric-row">
        <span>风险状态</span>
        <RiskStatusTag :status="selectedUpdateRecord?.riskStatus || { label: '--', type: 'info' }" />
      </div>
      <div class="soft-divider" />
      <el-upload
        ref="updateUploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        :file-list="updateFileList"
        :before-upload="beforeUpload"
        :on-change="handleUpdateChange"
        :on-remove="handleUpdateRemove"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">选择新的资质文件，提交后重新进入审核流程</div>
      </el-upload>
      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="updateDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="updating" @click="submitUpdate">提交更新</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.manager-card,
.file-stat {
  padding: 20px;
}

.file-stat {
  min-height: 128px;
}

.file-stat span {
  color: var(--text-muted);
}

.file-stat strong {
  display: block;
  margin: 12px 0 8px;
  font-size: 30px;
}

.file-stat p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.file-stat.danger strong {
  color: var(--danger);
}

.upload-panel {
  padding: 18px;
}

.upload-panel.soft {
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.82);
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title h3 {
  margin: 0;
}
</style>
