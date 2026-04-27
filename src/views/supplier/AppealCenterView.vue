<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import StatusTag from '../../components/StatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import { formatDate, formatDateTime } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const submitting = ref(false)
const uploadRef = ref(null)
const appealFiles = ref([])

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const appealRecords = computed(() => reviewsStore.appealsBySupplier(authStore.userId))
const eligibleRecords = computed(() =>
  reviewsStore
    .recordsBySupplier(authStore.userId)
    .filter((item) => item.appealable)
    .sort((a, b) => new Date(b.reviewedAt || b.uploadedAt) - new Date(a.reviewedAt || a.uploadedAt)),
)

const form = reactive({
  recordId: '',
  reasonType: 'entity',
  title: '',
  summary: '',
  description: '',
  requestedOutcome: '',
  contactPhone: '',
  evidenceNotes: '',
})

const activeAppealCount = computed(() =>
  appealRecords.value.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length,
)
const supplementAppealCount = computed(() =>
  appealRecords.value.filter((item) => item.status === 'supplement_required').length,
)
const closedAppealCount = computed(() =>
  appealRecords.value.filter((item) => ['accepted', 'rejected', 'closed'].includes(item.status)).length,
)

const selectedRecord = computed(() => eligibleRecords.value.find((item) => item.id === form.recordId) || eligibleRecords.value[0])
const selectedRecordAppeal = computed(() =>
  selectedRecord.value ? reviewsStore.latestAppealByRecord(selectedRecord.value.id) : undefined,
)
const selectedRecordEligibility = computed(() =>
  selectedRecord.value ? reviewsStore.canSubmitAppeal(selectedRecord.value.id) : { ok: false, message: '暂无可申诉记录。' },
)
const primaryActionLabel = computed(() => {
  if (selectedRecordEligibility.value.ok) {
    return '提交申诉'
  }
  if (selectedRecordAppeal.value?.status === 'supplement_required') {
    return '查看补件要求'
  }
  if (selectedRecordAppeal.value) {
    return '查看当前申诉'
  }
  return '当前不可申诉'
})
const focusAppeal = computed(() => {
  const targetId = String(route.query.appealId || '')
  return appealRecords.value.find((item) => item.id === targetId) || appealRecords.value[0]
})

watch(
  [() => route.query.recordId, supplier],
  () => {
    form.recordId = String(route.query.recordId || form.recordId || eligibleRecords.value[0]?.id || '')
    form.contactPhone = supplier.value?.enterprise.contactPhone || ''
  },
  { immediate: true },
)

watch(
  selectedRecord,
  (value) => {
    if (!value) return
    if (!form.recordId) {
      form.recordId = value.id
    }
    if (!form.title) {
      form.title = value.appealSceneTitle || `${value.fileName}申诉说明`
    }
    if (!form.summary) {
      form.summary = value.appealSceneSummary || value.adminOpinion || ''
    }
    if (!form.description) {
      form.description = `针对《${value.fileName}》的审核结论，补充说明如下：\n1. ${value.unmetClauses?.[0] || '请说明申诉理由'}\n2. ${value.improvementSuggestions?.[0] || '请补充佐证材料'}`
    }
    if (!form.requestedOutcome) {
      form.requestedOutcome = '希望管理员重新复核当前审核结论，并明确后续补件要求。'
    }
  },
  { immediate: true },
)

function appealStatusMeta(status) {
  return {
    submitted: { label: '已提交', type: 'warning' },
    under_review: { label: '复核中', type: 'primary' },
    supplement_required: { label: '待补充材料', type: 'danger' },
    accepted: { label: '申诉成立', type: 'success' },
    rejected: { label: '申诉驳回', type: 'danger' },
    closed: { label: '已结案', type: 'info' },
  }[status] || { label: status || '未知状态', type: 'info' }
}

function reasonTypeLabel(value) {
  return {
    entity: '主体信息异议',
    scope: '认证范围异议',
    authorization: '授权链路异议',
    material: '材料完整性异议',
    other: '其他说明',
  }[value] || value
}

function documentTypeLabel(value) {
  return standardsStore.documentTypes.find((item) => item.value === value)?.label || value
}

function validateRawFile(rawFile) {
  const allowTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!allowTypes.includes(rawFile.type)) {
    ElMessage.error('申诉材料仅支持 PDF、PNG、JPG、Word、Excel 文件。')
    return false
  }
  if (rawFile.size > 20 * 1024 * 1024) {
    ElMessage.error('单个申诉材料不能超过 20MB。')
    return false
  }
  return true
}

function beforeUpload(rawFile) {
  return validateRawFile(rawFile)
}

function handleUploadChange(_, files) {
  appealFiles.value = files.filter((file) => !file.raw || validateRawFile(file.raw))
}

function handleUploadRemove(_, files) {
  appealFiles.value = files
}

function resetSelection() {
  appealFiles.value = []
  uploadRef.value?.clearFiles()
}

function normalizeFiles(files) {
  return files.map((file) => ({
    name: file.name,
    type: file.raw?.type || file.type || '',
    size: file.size || 0,
  }))
}

function viewAppeal(appealId) {
  router.replace({ path: '/supplier/appeals', query: { appealId } })
}

function useRecord(recordId) {
  form.recordId = recordId
  form.title = ''
  form.summary = ''
  form.description = ''
  form.requestedOutcome = ''
  router.replace({ path: '/supplier/appeals', query: { recordId } })
}

function submitAppeal() {
  if (!selectedRecord.value) {
    ElMessage.error('当前没有可发起申诉的记录。')
    return
  }

  submitting.value = true

  setTimeout(() => {
    try {
      const appeal = reviewsStore.submitAppeal({
        recordId: selectedRecord.value.id,
        supplierId: authStore.userId,
        reasonType: form.reasonType,
        title: form.title,
        summary: form.summary,
        description: form.description,
        requestedOutcome: form.requestedOutcome,
        contactPhone: form.contactPhone,
        evidenceNotes: form.evidenceNotes,
        files: normalizeFiles(appealFiles.value),
      })
      ElMessage.success('申诉材料已提交，当前已进入管理员受理队列。')
      resetSelection()
      router.replace({ path: '/supplier/appeals', query: { appealId: appeal.id, recordId: selectedRecord.value.id } })
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      submitting.value = false
    }
  }, 700)
}

function handlePrimaryAction() {
  if (selectedRecordEligibility.value.ok) {
    submitAppeal()
    return
  }

  if (selectedRecordAppeal.value) {
    viewAppeal(selectedRecordAppeal.value.id)
  }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>申诉提交与记录</h1>
        <p>在这里提交申诉说明、补充材料，并持续查看管理员受理、复核、补件和结案状态。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="可申诉记录" :value="eligibleRecords.length" hint="当前允许发起申诉的审核结果" tone="warning" />
      <StatCard label="处理中申诉" :value="activeAppealCount" hint="已提交且仍在流转中的申诉" />
      <StatCard label="待补充" :value="supplementAppealCount" hint="管理员要求继续补件的申诉" tone="danger" />
      <StatCard label="已办结" :value="closedAppealCount" hint="已经有处理结论的申诉记录" tone="success" />
    </div>

    <div class="content-grid appeal-grid">
      <div class="section-card panel-card">
        <div class="panel-title">
          <div>
            <h3>发起申诉</h3>
            <p>先选择一条可申诉记录，再填写申诉摘要、详细说明和补充材料。</p>
          </div>
          <el-tag type="warning">{{ eligibleRecords.length ? '可提交' : '暂无可申诉记录' }}</el-tag>
        </div>

        <template v-if="selectedRecord">
          <div class="record-summary">
            <div class="record-summary-head">
              <strong>{{ selectedRecord.fileName }}</strong>
              <StatusTag :status="selectedRecord.status" />
            </div>
            <p>
              {{ documentTypeLabel(selectedRecord.category) }} · 审核时间
              {{ formatDateTime(selectedRecord.reviewedAt || selectedRecord.uploadedAt) }}
            </p>
            <div class="metric-row">
              <span>申诉截止</span>
              <strong>{{ formatDate(selectedRecord.appealDeadline) }}</strong>
            </div>
            <div v-if="selectedRecord.unmetClauses?.length" class="detail-block">
              <div class="section-subtitle">未满足条款</div>
              <div class="capsule-list">
                <span v-for="item in selectedRecord.unmetClauses" :key="item" class="capsule-item">{{ item }}</span>
              </div>
            </div>
            <div v-if="selectedRecord.improvementSuggestions?.length" class="detail-block">
              <div class="section-subtitle">整改建议</div>
              <div class="suggestion-list">
                <div v-for="item in selectedRecord.improvementSuggestions" :key="item" class="suggestion-item">{{ item }}</div>
              </div>
            </div>
          </div>

          <el-alert
            v-if="selectedRecordEligibility.ok === false"
            :title="selectedRecordEligibility.message"
            type="warning"
            :closable="false"
            style="margin-bottom: 16px"
          />

          <el-alert
            v-if="selectedRecordAppeal && !selectedRecordEligibility.ok"
            :title="`当前记录已有进行中的申诉：${appealStatusMeta(selectedRecordAppeal.status).label}。主按钮会直接带你查看当前进度。`"
            type="info"
            :closable="false"
            style="margin-bottom: 16px"
          />

          <el-form label-position="top">
            <el-form-item label="选择申诉记录">
              <el-select v-model="form.recordId" placeholder="选择要申诉的审核记录">
                <el-option
                  v-for="item in eligibleRecords"
                  :key="item.id"
                  :label="`${item.fileName}｜${formatDate(item.appealDeadline)}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="申诉类型">
              <el-select v-model="form.reasonType">
                <el-option label="主体信息异议" value="entity" />
                <el-option label="认证范围异议" value="scope" />
                <el-option label="授权链路异议" value="authorization" />
                <el-option label="材料完整性异议" value="material" />
                <el-option label="其他说明" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item label="申诉标题">
              <el-input v-model="form.title" maxlength="50" show-word-limit />
            </el-form-item>
            <el-form-item label="申诉摘要">
              <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="120" show-word-limit />
            </el-form-item>
            <el-form-item label="详细说明">
              <el-input v-model="form.description" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="期望处理结果">
              <el-input v-model="form.requestedOutcome" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="补充说明">
              <el-input v-model="form.evidenceNotes" type="textarea" :rows="3" placeholder="可补充材料清单、关键证据来源、联系人说明等" />
            </el-form-item>
            <el-form-item label="联系手机号">
              <el-input v-model="form.contactPhone" maxlength="11" />
            </el-form-item>
            <el-form-item label="申诉材料">
              <el-upload
                ref="uploadRef"
                drag
                multiple
                :auto-upload="false"
                :file-list="appealFiles"
                :before-upload="beforeUpload"
                :on-change="handleUploadChange"
                :on-remove="handleUploadRemove"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">将申诉材料拖到此处，或<em>点击选择文件</em></div>
                <template #tip>
                  <div class="status-text">支持 PDF、JPG、PNG、Word、Excel，单文件不超过 20MB。</div>
                </template>
              </el-upload>
            </el-form-item>
          </el-form>

          <div class="toolbar" style="margin-top: 18px">
            <el-button
              type="primary"
              :loading="submitting"
              :disabled="!selectedRecordEligibility.ok && !selectedRecordAppeal"
              @click="handlePrimaryAction"
            >
              {{ primaryActionLabel }}
            </el-button>
            <el-button plain @click="resetSelection">清空附件</el-button>
            <el-button
              v-if="selectedRecordAppeal && !selectedRecordEligibility.ok"
              type="warning"
              plain
              @click="viewAppeal(selectedRecordAppeal.id)"
            >
              查看当前申诉
            </el-button>
          </div>
        </template>

        <div v-else class="rich-empty">当前没有可申诉的审核记录。</div>
      </div>

      <div class="content-grid appeal-side">
        <div class="section-card panel-card">
          <div class="panel-title">
            <div>
              <h3>我的申诉记录</h3>
              <p>已提交的申诉会在这里持续更新处理状态和时间线。</p>
            </div>
          </div>
          <div v-if="appealRecords.length" class="appeal-list">
            <button
              v-for="item in appealRecords"
              :key="item.id"
              type="button"
              class="appeal-item"
              :class="{ active: focusAppeal?.id === item.id }"
              @click="viewAppeal(item.id)"
            >
              <div class="appeal-item-head">
                <strong>{{ item.title }}</strong>
                <el-tag :type="appealStatusMeta(item.status).type">{{ appealStatusMeta(item.status).label }}</el-tag>
              </div>
              <p>{{ item.fileName }}</p>
              <span>{{ formatDateTime(item.updatedAt || item.submittedAt) }}</span>
            </button>
          </div>
          <div v-else class="rich-empty">当前还没有提交过申诉。</div>
        </div>

        <div class="section-card panel-card">
          <template v-if="focusAppeal">
            <div class="panel-title">
              <div>
                <h3>申诉详情</h3>
                <p>{{ focusAppeal.title }}</p>
              </div>
              <el-tag :type="appealStatusMeta(focusAppeal.status).type">{{ appealStatusMeta(focusAppeal.status).label }}</el-tag>
            </div>
            <div class="metric-row">
              <span>关联文件</span>
              <strong>{{ focusAppeal.fileName }}</strong>
            </div>
            <div class="metric-row">
              <span>申诉类型</span>
              <strong>{{ reasonTypeLabel(focusAppeal.reasonType) }}</strong>
            </div>
            <div class="metric-row">
              <span>提交时间</span>
              <strong>{{ formatDateTime(focusAppeal.submittedAt) }}</strong>
            </div>
            <div class="metric-row">
              <span>最新进展</span>
              <strong>{{ focusAppeal.latestFeedback || '--' }}</strong>
            </div>
            <div class="detail-block">
              <div class="section-subtitle">申诉摘要</div>
              <div class="suggestion-item">{{ focusAppeal.summary }}</div>
            </div>
            <div class="detail-block">
              <div class="section-subtitle">详细说明</div>
              <div class="suggestion-item">{{ focusAppeal.description }}</div>
            </div>
            <div v-if="focusAppeal.attachments?.length" class="detail-block">
              <div class="section-subtitle">已提交材料</div>
              <div class="capsule-list">
                <span v-for="item in focusAppeal.attachments" :key="item.id" class="capsule-item">
                  {{ item.name }} · {{ item.sizeMB }}MB
                </span>
              </div>
            </div>
            <div class="detail-block">
              <div class="section-subtitle">流转记录</div>
              <div class="timeline-list">
                <div v-for="item in focusAppeal.timeline" :key="item.id" class="timeline-item">
                  <strong>{{ item.action }}</strong>
                  <span>{{ item.actor }} · {{ formatDateTime(item.at) }}</span>
                  <p>{{ item.note }}</p>
                </div>
              </div>
            </div>
            <div class="toolbar" style="margin-top: 18px">
              <el-button
                v-if="focusAppeal.recordId"
                plain
                @click="router.push(`/supplier/results?recordId=${focusAppeal.recordId}`)"
              >
                返回原审核结果
              </el-button>
              <el-button
                v-if="focusAppeal.recordId"
                type="primary"
                plain
                @click="useRecord(focusAppeal.recordId)"
              >
                作为新申诉模板查看
              </el-button>
            </div>
          </template>
          <div v-else class="rich-empty">请选择一条申诉记录查看详情。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appeal-grid {
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  align-items: start;
}

.appeal-side {
  align-content: start;
}

.panel-card {
  padding: 20px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
}

.record-summary {
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 248, 230, 0.56);
  border: 1px solid rgba(194, 134, 16, 0.18);
}

.record-summary-head,
.appeal-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.detail-block + .detail-block {
  margin-top: 14px;
}

.section-subtitle {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.suggestion-list,
.appeal-list,
.timeline-list {
  display: grid;
  gap: 10px;
}

.suggestion-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
  line-height: 1.7;
}

.appeal-item {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.88);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.appeal-item:hover,
.appeal-item.active {
  border-color: rgba(31, 115, 216, 0.35);
  box-shadow: 0 10px 24px rgba(24, 64, 116, 0.08);
  transform: translateY(-1px);
}

.appeal-item p,
.timeline-item p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.appeal-item span,
.timeline-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.timeline-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.9);
  border: 1px solid var(--line-soft);
}

@media (max-width: 1180px) {
  .appeal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
