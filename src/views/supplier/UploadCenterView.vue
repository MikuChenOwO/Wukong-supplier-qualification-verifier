<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
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
const draftSaving = ref(false)
const updateDialogVisible = ref(false)
const uploadRef = ref(null)
const updateUploadRef = ref(null)
const fileList = ref([])
const updateFileList = ref([])
const selectedUpdateRecord = ref(null)
const draftInfo = ref(suppliersStore.getFormDraft(authStore.userId, 'upload-center') || null)

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
const allRecords = computed(() => reviewsStore.recordsBySupplier(authStore.userId))
const renewalRecords = computed(() => reviewsStore.renewalRecordsBySupplier(authStore.userId))

const form = reactive({
  category: route.query.category || 'business-license',
})

if (draftInfo.value?.payload) {
  activeTab.value = draftInfo.value.payload.activeTab || activeTab.value
  form.category = draftInfo.value.payload.category || form.category
}

const materialChecklist = computed(() => {
  const latestByCategory = new Map()
  allRecords.value.forEach((item) => {
    if (!latestByCategory.has(item.category)) {
      latestByCategory.set(item.category, item)
    }
  })

  const buildItem = (category, required = true) => {
    const record = latestByCategory.get(category)
    let stateKey = 'optional'
    let state = { label: '可选补充', type: 'info', hint: '推荐上传，有助于提高材料完整度。' }

    if (!record && required) {
      stateKey = 'missing'
      state = { label: '待上传', type: 'danger', hint: '当前模板要求上传该材料。' }
    } else if (record?.renewalState.needUpdate) {
      stateKey = 'need-update'
      state = { label: '需要更新', type: 'warning', hint: record.renewalState.reason }
    } else if (record) {
      stateKey = 'uploaded'
      state = { label: '已上传', type: 'success', hint: `最近上传：${record.fileName}` }
    }

    return {
      category,
      label: standardsStore.documentTypes.find((item) => item.value === category)?.label || category,
      required,
      stateKey,
      state,
      record,
    }
  }

  return [
    ...(currentTemplate.value?.requiredDocuments || []).map((item) => buildItem(item, true)),
    ...(currentTemplate.value?.recommendedDocuments || [])
      .filter((item) => !(currentTemplate.value?.requiredDocuments || []).includes(item))
      .map((item) => buildItem(item, false)),
  ]
})

const checklistSummary = computed(() => ({
  required: materialChecklist.value.filter((item) => item.required).length,
  uploadedRequired: materialChecklist.value.filter((item) => item.required && item.stateKey === 'uploaded').length,
  missingRequired: materialChecklist.value.filter((item) => item.required && item.stateKey === 'missing').length,
  needUpdate: materialChecklist.value.filter((item) => item.stateKey === 'need-update').length,
  optionalMissing: materialChecklist.value.filter((item) => !item.required && !item.record).length,
}))

const missingRequiredMaterials = computed(() =>
  materialChecklist.value.filter((item) => item.required && item.stateKey === 'missing'),
)
const recommendedGapMaterials = computed(() =>
  materialChecklist.value.filter((item) => !item.required && !item.record),
)
const nextActionMaterial = computed(() => {
  if (missingRequiredMaterials.value.length) return missingRequiredMaterials.value[0]
  return materialChecklist.value.find((item) => item.stateKey === 'need-update') || recommendedGapMaterials.value[0] || null
})
const draftSummary = computed(() => {
  if (!draftInfo.value?.savedAt) return '当前没有可恢复的上传草稿'
  const suffix = draftInfo.value.persisted ? '，已保存在当前浏览器本地' : ''
  return `最近暂存于 ${formatDateTime(draftInfo.value.savedAt)}${suffix}`
})
const draftFileReminder = computed(() => {
  const selectedFiles = draftInfo.value?.payload?.selectedFiles || []
  if (!selectedFiles.length) return ''
  const names = selectedFiles.slice(0, 2).map((item) => item.name).join('、')
  const extra = selectedFiles.length > 2 ? ` 等 ${selectedFiles.length} 个文件` : ''
  return `上次草稿记录了 ${names}${extra}，恢复草稿后仍需重新选择本地文件。`
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

function buildDraftPayload() {
  return {
    activeTab: activeTab.value,
    category: form.category,
    selectedFiles: fileList.value.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.raw?.type || '',
    })),
  }
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
      suppliersStore.clearFormDraft(authStore.userId, 'upload-center')
      draftInfo.value = null
      ElMessage.success(`已完成 ${records.length} 份文件上传，并进入机器预审。`)
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

function handleSaveDraft() {
  draftSaving.value = true

  setTimeout(() => {
    draftInfo.value = suppliersStore.saveFormDraft(authStore.userId, 'upload-center', buildDraftPayload())
    ElMessage.success('文件上传草稿已暂存。')
    draftSaving.value = false
  }, 250)
}

function handleRestoreDraft() {
  const draft = suppliersStore.getFormDraft(authStore.userId, 'upload-center')
  if (!draft) {
    ElMessage.info('当前没有可恢复的上传草稿。')
    return
  }

  activeTab.value = draft.payload.activeTab || activeTab.value
  form.category = draft.payload.category || form.category
  draftInfo.value = draft
  resetSelection()

  if (draft.payload.selectedFiles?.length) {
    ElMessage.success('已恢复上传草稿，请重新选择本地文件后再提交。')
    return
  }

  ElMessage.success('已恢复上传草稿。')
}

function handleClearDraft() {
  suppliersStore.clearFormDraft(authStore.userId, 'upload-center')
  draftInfo.value = null
  ElMessage.success('上传草稿已清除。')
}

function handlePickCategory(category) {
  activeTab.value = 'upload'
  form.category = category
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>文件管理</h1>
        <p>统一上传资质文件、查看更细化的告警状态，并按当前供应商类型动态核对材料清单和上传缺口。</p>
      </div>
      <div class="toolbar">
        <el-button plain :loading="draftSaving" @click="handleSaveDraft">暂存草稿</el-button>
        <el-button plain @click="handleRestoreDraft">恢复草稿</el-button>
        <el-button v-if="draftInfo" plain type="danger" @click="handleClearDraft">清除草稿</el-button>
        <el-button type="primary" @click="activeTab = 'upload'">上传资质文件</el-button>
      </div>
    </div>

    <div class="stat-grid upload-stats">
      <div class="section-card file-stat">
        <span>全部文件</span>
        <strong>{{ allRecords.length }}</strong>
        <p>当前企业所有资质与审核记录</p>
      </div>
      <div class="section-card file-stat danger">
        <span>待处理缺口</span>
        <strong>{{ checklistSummary.missingRequired + checklistSummary.needUpdate }}</strong>
        <p>必传未补齐与需要更新的材料总数</p>
      </div>
      <div class="section-card file-stat">
        <span>模板完成度</span>
        <strong>{{ checklistSummary.uploadedRequired }}/{{ checklistSummary.required }}</strong>
        <p>当前准入模板的必传材料完成情况</p>
      </div>
      <div class="section-card file-stat">
        <span>准入模板</span>
        <strong>{{ currentTemplate?.version || '--' }}</strong>
        <p>{{ currentTemplate?.name || '待匹配模板' }}</p>
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
                <el-button type="primary" :loading="uploading" @click="submitUpload">上传并触发预审</el-button>
                <el-button plain @click="resetSelection">清空所选</el-button>
              </div>
            </div>

            <div class="upload-panel soft">
              <div class="panel-title">
                <h3>动态材料清单</h3>
                <el-tag type="success">{{ checklistSummary.uploadedRequired }}/{{ checklistSummary.required }} 已就绪</el-tag>
              </div>

              <el-alert
                v-if="nextActionMaterial"
                type="warning"
                :closable="false"
                :title="`优先处理：${nextActionMaterial.label}`"
                :description="nextActionMaterial.state.hint"
                style="margin-bottom: 14px"
              />
              <el-alert
                v-if="draftFileReminder"
                type="info"
                :closable="false"
                :description="draftFileReminder"
                style="margin-bottom: 14px"
              />

              <div class="gap-summary">
                <div class="gap-card">
                  <span>必传未上传</span>
                  <strong>{{ checklistSummary.missingRequired }}</strong>
                </div>
                <div class="gap-card">
                  <span>需要更新</span>
                  <strong>{{ checklistSummary.needUpdate }}</strong>
                </div>
                <div class="gap-card">
                  <span>推荐待补充</span>
                  <strong>{{ checklistSummary.optionalMissing }}</strong>
                </div>
              </div>

              <div class="metric-row">
                <span>草稿状态</span>
                <strong>{{ draftSummary }}</strong>
              </div>
              <div class="metric-row">
                <span>供应商类型</span>
                <strong>{{ standardsStore.supplierTypes.find((item) => item.value === supplier?.enterprise.supplierType)?.label || '--' }}</strong>
              </div>
              <div class="metric-row">
                <span>当前模板</span>
                <strong>{{ currentTemplate?.name || '--' }}</strong>
              </div>
              <div class="metric-row">
                <span>准入门槛</span>
                <strong>{{ currentTemplate?.threshold || '--' }} 分</strong>
              </div>

              <div class="quick-actions">
                <button
                  v-for="item in missingRequiredMaterials"
                  :key="`missing-${item.category}`"
                  type="button"
                  class="quick-action danger"
                  @click="handlePickCategory(item.category)"
                >
                  补传 {{ item.label }}
                </button>
                <button
                  v-for="item in recommendedGapMaterials.slice(0, 2)"
                  :key="`suggest-${item.category}`"
                  type="button"
                  class="quick-action"
                  @click="handlePickCategory(item.category)"
                >
                  可补充 {{ item.label }}
                </button>
              </div>

              <div class="checklist-list">
                <button
                  v-for="item in materialChecklist"
                  :key="item.category"
                  type="button"
                  class="checklist-item"
                  @click="handlePickCategory(item.category)"
                >
                  <div class="checklist-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="item.state.type">{{ item.state.label }}</el-tag>
                  </div>
                  <p>{{ item.required ? '必传材料' : '推荐补充材料' }}</p>
                  <span>{{ item.state.hint }}</span>
                </button>
              </div>

              <div class="soft-divider" />
              <div class="metric-row">
                <span>一票否决</span>
                <strong>{{ currentTemplate?.vetoRules?.join('、') || '无' }}</strong>
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
            <el-table-column label="机器校验" min-width="150">
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

.upload-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.gap-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.gap-card {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.gap-card span {
  display: block;
  color: var(--text-muted);
  font-size: 13px;
}

.gap-card strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 14px 0 16px;
}

.quick-action {
  padding: 8px 12px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-secondary);
  cursor: pointer;
}

.quick-action.danger {
  border-color: rgba(208, 78, 57, 0.22);
  color: var(--danger);
  background: rgba(255, 244, 242, 0.92);
}

.checklist-list {
  display: grid;
  gap: 10px;
}

.checklist-item {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.checklist-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.checklist-item p {
  margin: 8px 0 4px;
  color: var(--text-secondary);
}

.checklist-item span {
  color: var(--text-muted);
  font-size: 12px;
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

@media (max-width: 1200px) {
  .upload-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gap-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .upload-stats {
    grid-template-columns: 1fr;
  }
}
</style>
