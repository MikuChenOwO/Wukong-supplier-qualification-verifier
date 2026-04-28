<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import RiskStatusTag from '../../components/RiskStatusTag.vue'
import StatCard from '../../components/StatCard.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const focusedTaskId = ref('')
const selectedTaskIds = ref([])

const filters = reactive({
  keyword: '',
  status: '',
  source: '',
})

const actionForm = reactive({
  nextStatus: 'in_progress',
  comment: '',
  resultingRecordStatus: 'approved',
  lifecycleStatus: 'active',
  unmetClauses: '',
  improvementSuggestions: '',
})

const bulkForm = reactive({
  assigneeName: '',
  nextStatus: 'in_progress',
  comment: '',
  resultingRecordStatus: 'approved',
  lifecycleStatus: 'watch',
})

const reviewerOptions = ['采购审核员-金箍', '复审专员-木吒', '采购经理-敖烈']

function statusMeta(status) {
  return {
    pending: { label: '待处理', type: 'warning' },
    in_progress: { label: '复审中', type: 'primary' },
    approved: { label: '已通过', type: 'success' },
    rejected: { label: '未通过', type: 'danger' },
    closed: { label: '已关闭', type: 'info' },
  }[status] || { label: status || '未知状态', type: 'info' }
}

function sourceLabel(value) {
  return {
    'risk-radar': '动态风控触发',
    'file-update': '资料更新触发',
    manual: '人工发起',
  }[value] || value
}

function documentTypeLabel(value) {
  return standardsStore.documentTypes.find((item) => item.value === value)?.label || value
}

const taskRows = computed(() =>
  reviewsStore.allRereviewTasks.filter((item) => {
    const keywordMatched =
      !filters.keyword ||
      normalizeKeyword(item.supplierName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.fileName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.taskNo).includes(normalizeKeyword(filters.keyword))
    const statusMatched = !filters.status || item.status === filters.status
    const sourceMatched = !filters.source || item.triggerSource === filters.source
    return keywordMatched && statusMatched && sourceMatched
  }),
)

const pendingCount = computed(() => reviewsStore.allRereviewTasks.filter((item) => item.status === 'pending').length)
const progressCount = computed(() => reviewsStore.allRereviewTasks.filter((item) => item.status === 'in_progress').length)
const approvedCount = computed(() => reviewsStore.allRereviewTasks.filter((item) => item.status === 'approved').length)
const rejectedCount = computed(() => reviewsStore.allRereviewTasks.filter((item) => item.status === 'rejected').length)
const assignedCount = computed(() => reviewsStore.allRereviewTasks.filter((item) => item.reviewerName).length)

const focusTask = computed(() => {
  const taskId = String(focusedTaskId.value || '')
  return taskRows.value.find((item) => item.id === taskId) || taskRows.value[0]
})

watch(
  taskRows,
  (value) => {
    if (!value.length) {
      focusedTaskId.value = ''
      selectedTaskIds.value = []
      return
    }

    if (!value.some((item) => item.id === focusedTaskId.value)) {
      focusedTaskId.value = value[0].id
    }

    selectedTaskIds.value = selectedTaskIds.value.filter((item) => value.some((row) => row.id === item))
  },
  { immediate: true },
)

watch(
  focusTask,
  (value) => {
    if (!value) return
    actionForm.nextStatus = value.status === 'pending' ? 'in_progress' : value.status === 'in_progress' ? 'approved' : value.status
    actionForm.comment = value.comment || ''
    actionForm.resultingRecordStatus = value.recordStatus || 'approved'
    actionForm.lifecycleStatus = value.lifecycleStatusAfter || (value.status === 'approved' ? 'active' : 'watch')
    actionForm.unmetClauses = ''
    actionForm.improvementSuggestions = ''
  },
  { immediate: true },
)

watch(
  () => actionForm.nextStatus,
  (value) => {
    if (value === 'rejected') {
      actionForm.resultingRecordStatus = 'rejected'
      actionForm.lifecycleStatus = 'frozen'
      return
    }

    if (value === 'approved' && actionForm.resultingRecordStatus === 'rejected') {
      actionForm.resultingRecordStatus = 'approved'
    }

    if (value === 'approved' && actionForm.lifecycleStatus === 'frozen') {
      actionForm.lifecycleStatus = 'active'
    }
  },
)

watch(
  () => bulkForm.nextStatus,
  (value) => {
    if (value === 'rejected') {
      bulkForm.resultingRecordStatus = 'rejected'
      bulkForm.lifecycleStatus = 'frozen'
      return
    }

    if (value === 'approved' && bulkForm.resultingRecordStatus === 'rejected') {
      bulkForm.resultingRecordStatus = 'approved'
    }

    if (value === 'approved' && bulkForm.lifecycleStatus === 'frozen') {
      bulkForm.lifecycleStatus = 'active'
    }
  },
)

function focusTaskCard(row) {
  focusedTaskId.value = row.id
}

function toggleTaskSelection(taskId) {
  if (selectedTaskIds.value.includes(taskId)) {
    selectedTaskIds.value = selectedTaskIds.value.filter((item) => item !== taskId)
    return
  }
  selectedTaskIds.value = [...selectedTaskIds.value, taskId]
}

function handleTaskCardClick(row) {
  focusTaskCard(row)
  toggleTaskSelection(row.id)
}

function handleSelectionChange(taskId, checked) {
  if (checked) {
    if (!selectedTaskIds.value.includes(taskId)) {
      selectedTaskIds.value = [...selectedTaskIds.value, taskId]
    }
    return
  }
  selectedTaskIds.value = selectedTaskIds.value.filter((item) => item !== taskId)
}

function toggleSelectAll() {
  if (selectedTaskIds.value.length === taskRows.value.length) {
    selectedTaskIds.value = []
    return
  }
  selectedTaskIds.value = taskRows.value.map((item) => item.id)
}

function openSupplierArchive() {
  if (!focusTask.value) return
  router.push(`/admin/suppliers?supplierId=${focusTask.value.supplierId}`)
}

function openReviewRecord() {
  if (!focusTask.value?.recordId) return
  router.push(`/admin/reviews/${focusTask.value.recordId}`)
}

function assignSelected(startReview = false) {
  try {
    const result = reviewsStore.assignRereviewTasks({
      taskIds: selectedTaskIds.value,
      assigneeName: bulkForm.assigneeName || authStore.displayName,
      operatorName: authStore.displayName,
      startReview,
      comment: bulkForm.comment,
    })
    ElMessage.success(`已完成 ${result.length} 条重审任务的${startReview ? '指派并受理' : '指派'}。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function batchProcessSelected() {
  try {
    const result = reviewsStore.batchProcessRereviewTasks({
      taskIds: selectedTaskIds.value,
      operatorName: authStore.displayName,
      nextStatus: bulkForm.nextStatus,
      comment: bulkForm.comment,
      resultingRecordStatus:
        bulkForm.nextStatus === 'closed'
          ? ''
          : bulkForm.nextStatus === 'rejected'
            ? 'rejected'
            : bulkForm.resultingRecordStatus,
      lifecycleStatus: bulkForm.lifecycleStatus,
    })
    ElMessage.success(`已批量处理 ${result.length} 条重审任务。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function submitAction() {
  if (!focusTask.value) return

  try {
    const result = reviewsStore.processRereviewTask({
      taskId: focusTask.value.id,
      reviewerName: authStore.displayName,
      nextStatus: actionForm.nextStatus,
      comment: actionForm.comment,
      resultingRecordStatus:
        actionForm.nextStatus === 'closed'
          ? ''
          : actionForm.nextStatus === 'rejected'
            ? 'rejected'
            : actionForm.resultingRecordStatus,
      lifecycleStatus: actionForm.lifecycleStatus,
      unmetClauses: actionForm.unmetClauses,
      improvementSuggestions: actionForm.improvementSuggestions,
    })
    ElMessage.success(`重审任务已更新为“${statusMeta(result.status).label}”。`)
    focusedTaskId.value = result.id
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>复审与变更重审台</h1>
        <p>统一承接动态风控触发和资料更新触发的重审任务，并支持批量指派、批量处理和结果回写。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="待处理重审" :value="pendingCount" hint="已生成但尚未开始处理的重审任务" />
      <StatCard label="处理中" :value="progressCount" hint="正在复审中的任务" />
      <StatCard label="已指派" :value="assignedCount" hint="已经明确到复审人的任务数量" />
      <StatCard label="重审通过" :value="approvedCount" hint="已完成并恢复正常归档的任务" tone="success" />
      <StatCard label="重审未通过" :value="rejectedCount" hint="复审后仍需继续更新资料的任务" tone="danger" />
    </div>

    <div class="content-grid workbench-grid">
      <div class="section-card panel-card">
        <div class="toolbar" style="margin-bottom: 16px">
          <el-input v-model="filters.keyword" placeholder="搜索供应商、文件名或重审任务号" clearable style="max-width: 280px" />
          <el-select v-model="filters.status" placeholder="任务状态" clearable style="width: 160px">
            <el-option label="待处理" value="pending" />
            <el-option label="复审中" value="in_progress" />
            <el-option label="已通过" value="approved" />
            <el-option label="未通过" value="rejected" />
            <el-option label="已关闭" value="closed" />
          </el-select>
          <el-select v-model="filters.source" placeholder="触发来源" clearable style="width: 180px">
            <el-option label="动态风控触发" value="risk-radar" />
            <el-option label="资料更新触发" value="file-update" />
            <el-option label="人工发起" value="manual" />
          </el-select>
        </div>

        <div class="section-card bulk-card">
          <div class="panel-title">
            <div>
              <h3>批量处理</h3>
              <p>先勾选左侧任务，再统一指派复审人、开始复审或批量处理结论。</p>
            </div>
            <el-button plain @click="toggleSelectAll">
              {{ selectedTaskIds.length === taskRows.length && taskRows.length ? '取消全选' : '全选当前列表' }}
            </el-button>
          </div>

          <el-form label-position="top">
            <div class="bulk-grid">
              <el-form-item label="复审人">
                <el-select v-model="bulkForm.assigneeName" placeholder="选择复审人">
                  <el-option v-for="item in reviewerOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="批量状态">
                <el-select v-model="bulkForm.nextStatus">
                  <el-option label="开始复审" value="in_progress" />
                  <el-option label="重审通过" value="approved" />
                  <el-option label="重审未通过" value="rejected" />
                  <el-option label="关闭任务" value="closed" />
                </el-select>
              </el-form-item>
            </div>

            <div v-if="bulkForm.nextStatus !== 'closed'" class="bulk-grid">
              <el-form-item label="文件审核结论">
                <el-select v-model="bulkForm.resultingRecordStatus">
                  <el-option label="通过" value="approved" />
                  <el-option label="有条件通过" value="conditional" />
                  <el-option label="未通过" value="rejected" />
                </el-select>
              </el-form-item>
              <el-form-item label="生命周期状态">
                <el-select v-model="bulkForm.lifecycleStatus">
                  <el-option label="正常" value="active" />
                  <el-option label="重点观察" value="watch" />
                  <el-option label="已冻结" value="frozen" />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item label="批量处理意见">
              <el-input v-model="bulkForm.comment" type="textarea" :rows="3" placeholder="会同步写入选中重审任务的处理意见。" />
            </el-form-item>
          </el-form>
          <div class="toolbar">
            <el-button type="primary" plain @click="assignSelected()">批量指派</el-button>
            <el-button type="primary" @click="assignSelected(true)">指派并开始复审</el-button>
            <el-button type="warning" plain @click="batchProcessSelected">批量处理状态</el-button>
            <span class="status-text">当前已选 {{ selectedTaskIds.length }} 条</span>
          </div>
        </div>

        <div v-if="taskRows.length" class="task-list">
          <button
            v-for="item in taskRows"
            :key="item.id"
            type="button"
            class="task-item"
            :class="{ active: focusTask?.id === item.id, selected: selectedTaskIds.includes(item.id) }"
            @click="handleTaskCardClick(item)"
          >
            <div class="task-item-head">
              <div class="task-item-head-left">
                <el-checkbox
                  :model-value="selectedTaskIds.includes(item.id)"
                  @click.stop
                  @change="(checked) => handleSelectionChange(item.id, checked)"
                />
                <div>
                  <strong>{{ item.taskNo }}</strong>
                  <p>{{ item.supplierName }}</p>
                </div>
              </div>
              <el-tag :type="statusMeta(item.status).type">{{ statusMeta(item.status).label }}</el-tag>
            </div>
            <span>{{ item.fileName }} · {{ sourceLabel(item.triggerSource) }}</span>
            <span>{{ item.reviewerName ? `复审人：${item.reviewerName}` : '待指派复审人' }}</span>
            <p>{{ item.reason }}</p>
          </button>
        </div>
        <div v-else class="rich-empty">当前没有符合条件的重审任务。</div>
      </div>

      <div class="section-card panel-card detail-panel">
        <template v-if="focusTask">
          <div class="panel-title">
            <div>
              <h3>重审详情</h3>
              <p>{{ focusTask.taskNo }}</p>
            </div>
            <el-tag :type="statusMeta(focusTask.status).type">{{ statusMeta(focusTask.status).label }}</el-tag>
          </div>

          <div class="metric-row">
            <span>供应商</span>
            <strong>{{ focusTask.supplierName }}</strong>
          </div>
          <div class="metric-row">
            <span>关联文件</span>
            <strong>{{ focusTask.fileName }}</strong>
          </div>
          <div class="metric-row">
            <span>文件类型</span>
            <strong>{{ documentTypeLabel(focusTask.category) }}</strong>
          </div>
          <div class="metric-row">
            <span>触发来源</span>
            <strong>{{ sourceLabel(focusTask.triggerSource) }}</strong>
          </div>
          <div class="metric-row">
            <span>创建时间</span>
            <strong>{{ formatDateTime(focusTask.createdAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>复审人</span>
            <strong>{{ focusTask.reviewerName || '待指派' }}</strong>
          </div>
          <div class="metric-row">
            <span>指派时间</span>
            <strong>{{ focusTask.assignedAt ? formatDateTime(focusTask.assignedAt) : '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>当前文件状态</span>
            <strong><StatusTag :status="focusTask.recordStatus || ''" /></strong>
          </div>
          <div class="metric-row">
            <span>当前风险状态</span>
            <strong><RiskStatusTag :status="focusTask.riskStatus" /></strong>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">触发原因</div>
            <div class="suggestion-item">{{ focusTask.reason }}</div>
          </div>

          <div class="section-card action-card">
            <div class="panel-title">
              <div>
                <h3>处理动作</h3>
                <p>可以单条开始复审，也可以直接给出通过、未通过或关闭结论，并同步回写档案状态。</p>
              </div>
            </div>

            <el-form label-position="top">
              <el-form-item label="重审状态">
                <el-select v-model="actionForm.nextStatus">
                  <el-option label="开始复审" value="in_progress" />
                  <el-option label="重审通过" value="approved" />
                  <el-option label="重审未通过" value="rejected" />
                  <el-option label="关闭任务" value="closed" />
                </el-select>
              </el-form-item>

              <el-form-item v-if="actionForm.nextStatus !== 'closed'" label="文件审核结论">
                <el-select v-model="actionForm.resultingRecordStatus">
                  <el-option label="通过" value="approved" />
                  <el-option label="有条件通过" value="conditional" />
                  <el-option label="未通过" value="rejected" />
                </el-select>
              </el-form-item>

              <el-form-item label="供应商生命周期状态">
                <el-select v-model="actionForm.lifecycleStatus">
                  <el-option label="正常" value="active" />
                  <el-option label="重点观察" value="watch" />
                  <el-option label="已冻结" value="frozen" />
                </el-select>
              </el-form-item>

              <el-form-item label="处理意见">
                <el-input v-model="actionForm.comment" type="textarea" :rows="4" />
              </el-form-item>

              <el-form-item v-if="actionForm.resultingRecordStatus !== 'approved'" label="未满足条款">
                <el-input v-model="actionForm.unmetClauses" type="textarea" :rows="3" placeholder="每行一条" />
              </el-form-item>
              <el-form-item v-if="actionForm.resultingRecordStatus !== 'approved'" label="整改建议">
                <el-input v-model="actionForm.improvementSuggestions" type="textarea" :rows="3" placeholder="每行一条" />
              </el-form-item>
            </el-form>

            <div class="toolbar" style="margin-top: 18px">
              <el-button type="primary" @click="submitAction">保存重审结果</el-button>
              <el-button plain @click="openReviewRecord">查看关联文件</el-button>
              <el-button plain @click="openSupplierArchive">查看供应商档案</el-button>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">流转记录</div>
            <div class="timeline-list">
              <div v-for="item in focusTask.timeline" :key="item.id" class="timeline-item">
                <strong>{{ item.action }}</strong>
                <span>{{ item.actor }} · {{ formatDateTime(item.at) }}</span>
                <p>{{ item.note }}</p>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="rich-empty">请选择一条重审任务查看详情。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workbench-grid {
  grid-template-columns: minmax(340px, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
}

.panel-card,
.action-card {
  padding: 20px;
}

.bulk-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(248, 251, 255, 0.9);
}

.bulk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.detail-panel {
  position: sticky;
  top: 0;
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

.task-list,
.timeline-list {
  display: grid;
  gap: 12px;
}

.task-item {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.task-item:hover,
.task-item.active {
  border-color: rgba(31, 115, 216, 0.35);
  box-shadow: 0 10px 24px rgba(24, 64, 116, 0.08);
  transform: translateY(-1px);
}

.task-item.selected {
  border-color: rgba(215, 134, 47, 0.42);
  box-shadow: 0 10px 24px rgba(215, 134, 47, 0.12);
}

.task-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.task-item-head-left {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.task-item p,
.timeline-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.task-item span,
.timeline-item span {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.detail-block + .detail-block {
  margin-top: 16px;
}

.section-subtitle {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.suggestion-item,
.timeline-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.action-card {
  margin-top: 18px;
}

@media (max-width: 1180px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }

  .bulk-grid {
    grid-template-columns: 1fr;
  }
}
</style>
