<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import StatCard from '../../components/StatCard.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDate, formatDateTime, normalizeKeyword } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const filters = reactive({
  keyword: '',
  status: '',
})
const selectedAppealIds = ref([])
const focusedAppealId = ref(String(route.query.appealId || ''))

const actionForm = reactive({
  nextStatus: 'under_review',
  feedback: '',
  resultingRecordStatus: '',
  resultingOpinion: '',
  resultingClauses: '',
  resultingSuggestions: '',
})
const bulkForm = reactive({
  assigneeName: '',
  nextStatus: 'under_review',
  feedback: '',
})
const reviewerOptions = ['采购审核员 金箍', '复核专员 木吒', '采购经理 敖烈']

const appealRows = computed(() =>
  reviewsStore.allAppeals.filter((item) => {
    const keywordMatched =
      !filters.keyword ||
      normalizeKeyword(item.supplierName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.fileName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.title).includes(normalizeKeyword(filters.keyword))
    const statusMatched = !filters.status || item.status === filters.status
    return keywordMatched && statusMatched
  }),
)

const activeCount = computed(() =>
  reviewsStore.allAppeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length,
)
const supplementCount = computed(() =>
  reviewsStore.allAppeals.filter((item) => item.status === 'supplement_required').length,
)
const unassignedCount = computed(() => reviewsStore.allAppeals.filter((item) => !item.assigneeName).length)
const acceptedCount = computed(() =>
  reviewsStore.allAppeals.filter((item) => item.status === 'accepted').length,
)
const closedCount = computed(() =>
  reviewsStore.allAppeals.filter((item) => ['rejected', 'closed'].includes(item.status)).length,
)
const reviewerWorkloads = computed(() => {
  const groups = new Map()

  reviewsStore.allAppeals.forEach((item) => {
    const key = item.assigneeName || '待指派'
    const current = groups.get(key) || {
      name: key,
      total: 0,
      active: 0,
      closed: 0,
      accepted: 0,
    }

    current.total += 1
    if (['submitted', 'under_review', 'supplement_required'].includes(item.status)) {
      current.active += 1
    }
    if (['rejected', 'closed'].includes(item.status)) {
      current.closed += 1
    }
    if (item.status === 'accepted') {
      current.accepted += 1
    }
    groups.set(key, current)
  })

  return Array.from(groups.values()).sort((a, b) => b.active - a.active || b.total - a.total)
})
const reasonStats = computed(() => {
  const total = reviewsStore.allAppeals.length || 1
  const groups = new Map()

  reviewsStore.allAppeals.forEach((item) => {
    const key = reasonTypeLabel(item.reasonType)
    groups.set(key, (groups.get(key) || 0) + 1)
  })

  return Array.from(groups.entries())
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})
const assignedRate = computed(() => {
  const total = reviewsStore.allAppeals.length
  if (!total) return 0
  return Math.round((reviewsStore.allAppeals.filter((item) => item.assigneeName).length / total) * 100)
})
const avgHandleHours = computed(() => {
  const rows = reviewsStore.allAppeals.filter((item) => item.updatedAt && item.submittedAt)
  if (!rows.length) return 0
  const totalHours = rows.reduce((sum, item) => sum + (new Date(item.updatedAt) - new Date(item.submittedAt)) / 3600000, 0)
  return Math.round((totalHours / rows.length) * 10) / 10
})
const acceptedRate = computed(() => {
  const total = reviewsStore.allAppeals.length
  if (!total) return 0
  return Math.round((acceptedCount.value / total) * 100)
})
const reviewerBarMax = computed(() => Math.max(...reviewerWorkloads.value.map((item) => item.total), 1))
const reasonBarMax = computed(() => Math.max(...reasonStats.value.map((item) => item.count), 1))

const focusAppeal = computed(() => {
  const targetId = String(focusedAppealId.value || '')
  return appealRows.value.find((item) => item.id === targetId) || appealRows.value[0]
})
const focusRecord = computed(() => (focusAppeal.value ? reviewsStore.getRecord(focusAppeal.value.recordId) : undefined))

watch(
  appealRows,
  (value) => {
    if (!value.length) {
      focusedAppealId.value = ''
      selectedAppealIds.value = []
      return
    }

    if (!value.some((item) => item.id === focusedAppealId.value)) {
      focusedAppealId.value = value[0].id
    }

    selectedAppealIds.value = selectedAppealIds.value.filter((item) => value.some((row) => row.id === item))
  },
  { immediate: true },
)

watch(
  focusAppeal,
  (value) => {
    if (!value) return
    actionForm.nextStatus =
      value.status === 'submitted' ? 'under_review' : value.status === 'supplement_required' ? 'accepted' : 'accepted'
    actionForm.feedback = value.latestFeedback || ''
    actionForm.resultingRecordStatus = focusRecord.value?.status === 'approved' ? 'approved' : 'approved'
    actionForm.resultingOpinion = focusRecord.value?.adminOpinion || ''
    actionForm.resultingClauses = (focusRecord.value?.unmetClauses || []).join('\n')
    actionForm.resultingSuggestions = (focusRecord.value?.improvementSuggestions || []).join('\n')
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

function openAppeal(row) {
  focusedAppealId.value = row.id
}

function handleSelectionChange(appealId, checked) {
  if (checked) {
    if (!selectedAppealIds.value.includes(appealId)) {
      selectedAppealIds.value = [...selectedAppealIds.value, appealId]
    }
    return
  }
  selectedAppealIds.value = selectedAppealIds.value.filter((item) => item !== appealId)
}

function toggleAppealSelection(appealId) {
  handleSelectionChange(appealId, !selectedAppealIds.value.includes(appealId))
}

function handleAppealCardClick(row) {
  openAppeal(row)
  toggleAppealSelection(row.id)
}

function toggleSelectAll() {
  if (selectedAppealIds.value.length === appealRows.value.length) {
    selectedAppealIds.value = []
    return
  }
  selectedAppealIds.value = appealRows.value.map((item) => item.id)
}

function openRecordDetail() {
  if (!focusAppeal.value) return
  router.push(`/admin/reviews/${focusAppeal.value.recordId}`)
}

function assignSelected(startReview = false) {
  try {
    const result = reviewsStore.assignAppeals({
      appealIds: selectedAppealIds.value,
      assigneeName: bulkForm.assigneeName || authStore.displayName,
      operatorName: authStore.displayName,
      startReview,
    })
    ElMessage.success(`已完成 ${result.length} 条申诉的${startReview ? '指派并受理' : '指派'}。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function batchProcessSelected() {
  try {
    const result = reviewsStore.batchProcessAppeals({
      appealIds: selectedAppealIds.value,
      operatorName: authStore.displayName,
      nextStatus: bulkForm.nextStatus,
      feedback: bulkForm.feedback,
    })
    ElMessage.success(`已批量处理 ${result.length} 条申诉。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function submitAction() {
  if (!focusAppeal.value) return

  try {
    const result = reviewsStore.processAppeal({
      appealId: focusAppeal.value.id,
      operatorName: authStore.displayName,
      nextStatus: actionForm.nextStatus,
      feedback: actionForm.feedback,
      resultingRecordStatus: actionForm.nextStatus === 'accepted' ? actionForm.resultingRecordStatus : '',
      resultingOpinion: actionForm.resultingOpinion,
      resultingClauses: actionForm.resultingClauses,
      resultingSuggestions: actionForm.resultingSuggestions,
    })
    ElMessage.success(`申诉已更新为“${appealStatusMeta(result.status).label}”。`)
    focusedAppealId.value = result.id
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>申诉复核工作台</h1>
        <p>统一查看供应商申诉、补件请求和复核结论，并直接联动原审核记录完成结案。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="处理中申诉" :value="activeCount" hint="已提交、复核中和待补件的申诉" />
      <StatCard label="待补件" :value="supplementCount" hint="管理员已要求供应商继续补充材料" tone="danger" />
      <StatCard label="待指派" :value="unassignedCount" hint="还没有明确复核负责人的申诉" />
      <StatCard label="申诉成立" :value="acceptedCount" hint="已调整处理结论的申诉" tone="success" />
      <StatCard label="已关闭" :value="closedCount" hint="驳回或结案的申诉记录" />
    </div>

    <div class="dashboard-grid">
      <div class="section-card board-card">
        <div class="panel-title">
          <div>
            <h3>申诉运营概览</h3>
            <p>先看整体指派、处理和申诉成立情况，方便判断当前复核节奏。</p>
          </div>
        </div>
        <div class="board-metric-grid">
          <div class="board-metric">
            <span>指派覆盖率</span>
            <strong>{{ assignedRate }}%</strong>
            <p>当前已有明确复核人的申诉占比</p>
          </div>
          <div class="board-metric">
            <span>申诉成立率</span>
            <strong>{{ acceptedRate }}%</strong>
            <p>已处理申诉中调整原结论的比例</p>
          </div>
          <div class="board-metric">
            <span>平均处理时长</span>
            <strong>{{ avgHandleHours }}h</strong>
            <p>按提交到最近更新时间估算</p>
          </div>
        </div>
      </div>

      <div class="section-card board-card">
        <div class="panel-title">
          <div>
            <h3>复核人工作量分布</h3>
            <p>帮助管理员判断谁在忙、谁还可以继续接单。</p>
          </div>
        </div>
        <div class="board-list" v-if="reviewerWorkloads.length">
          <div v-for="item in reviewerWorkloads" :key="item.name" class="board-row">
            <div class="board-row-head">
              <strong>{{ item.name }}</strong>
              <span>{{ item.total }} 条</span>
            </div>
            <div class="board-bar-track">
              <div class="board-bar-fill" :style="{ width: `${(item.total / reviewerBarMax) * 100}%` }"></div>
            </div>
            <p>处理中 {{ item.active }} 条 · 已成立 {{ item.accepted }} 条 · 已关闭 {{ item.closed }} 条</p>
          </div>
        </div>
        <div v-else class="rich-empty compact-empty">当前还没有申诉工作量数据。</div>
      </div>

      <div class="section-card board-card">
        <div class="panel-title">
          <div>
            <h3>申诉原因分布</h3>
            <p>看看最近申诉主要集中在哪些异议类型，便于优化审核策略。</p>
          </div>
        </div>
        <div class="board-list" v-if="reasonStats.length">
          <div v-for="item in reasonStats" :key="item.label" class="board-row">
            <div class="board-row-head">
              <strong>{{ item.label }}</strong>
              <span>{{ item.count }} 条 · {{ item.percent }}%</span>
            </div>
            <div class="board-bar-track board-bar-track-soft">
              <div class="board-bar-fill board-bar-fill-warm" :style="{ width: `${(item.count / reasonBarMax) * 100}%` }"></div>
            </div>
          </div>
        </div>
        <div v-else class="rich-empty compact-empty">当前还没有申诉原因统计。</div>
      </div>
    </div>

    <div class="content-grid appeal-grid">
      <div class="section-card panel-card">
        <div class="toolbar" style="margin-bottom: 16px">
          <el-input v-model="filters.keyword" placeholder="搜索供应商、文件名或申诉标题" clearable style="max-width: 280px" />
          <el-select v-model="filters.status" placeholder="申诉状态" clearable style="width: 180px">
            <el-option label="已提交" value="submitted" />
            <el-option label="复核中" value="under_review" />
            <el-option label="待补充材料" value="supplement_required" />
            <el-option label="申诉成立" value="accepted" />
            <el-option label="申诉驳回" value="rejected" />
            <el-option label="已结案" value="closed" />
          </el-select>
        </div>

        <div class="section-card bulk-card">
          <div class="panel-title">
            <div>
              <h3>批量处理</h3>
              <p>先勾选左侧申诉，再统一指派复核人或批量受理、补件、驳回、结案。</p>
            </div>
            <el-button plain @click="toggleSelectAll">
              {{ selectedAppealIds.length === appealRows.length && appealRows.length ? '取消全选' : '全选当前列表' }}
            </el-button>
          </div>

          <el-form label-position="top">
            <div class="bulk-grid">
              <el-form-item label="复核人">
                <el-select v-model="bulkForm.assigneeName" placeholder="选择复核人">
                  <el-option v-for="item in reviewerOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="批量状态">
                <el-select v-model="bulkForm.nextStatus">
                  <el-option label="开始复核" value="under_review" />
                  <el-option label="要求补件" value="supplement_required" />
                  <el-option label="申诉驳回" value="rejected" />
                  <el-option label="结案归档" value="closed" />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="批量处理意见">
              <el-input v-model="bulkForm.feedback" type="textarea" :rows="3" placeholder="会同步写入选中申诉的处理意见" />
            </el-form-item>
          </el-form>
          <div class="toolbar">
            <el-button type="primary" plain @click="assignSelected()">批量指派</el-button>
            <el-button type="primary" @click="assignSelected(true)">指派并开始复核</el-button>
            <el-button type="warning" plain @click="batchProcessSelected">批量处理状态</el-button>
            <span class="status-text">当前已选 {{ selectedAppealIds.length }} 条</span>
          </div>
        </div>

        <div v-if="appealRows.length" class="appeal-list">
          <button
            v-for="item in appealRows"
            :key="item.id"
            type="button"
            class="appeal-item"
            :class="{ active: focusAppeal?.id === item.id, selected: selectedAppealIds.includes(item.id) }"
            @click="handleAppealCardClick(item)"
          >
            <div class="appeal-item-head">
              <div class="appeal-item-head-left">
                <el-checkbox
                  :model-value="selectedAppealIds.includes(item.id)"
                  @click.stop
                  @change="(checked) => handleSelectionChange(item.id, checked)"
                />
                <strong>{{ item.title }}</strong>
              </div>
              <el-tag :type="appealStatusMeta(item.status).type">{{ appealStatusMeta(item.status).label }}</el-tag>
            </div>
            <p>{{ item.supplierName }}</p>
            <span>{{ item.fileName }} · {{ formatDateTime(item.updatedAt || item.submittedAt) }}</span>
            <span>{{ item.assigneeName ? `复核人：${item.assigneeName}` : '待指派复核人' }}</span>
          </button>
        </div>
        <div v-else class="rich-empty">当前没有符合条件的申诉记录。</div>
      </div>

      <div class="section-card panel-card detail-panel">
        <template v-if="focusAppeal">
          <div class="panel-title">
            <div>
              <h3>复核详情</h3>
              <p>{{ focusAppeal.title }}</p>
            </div>
            <el-tag :type="appealStatusMeta(focusAppeal.status).type">{{ appealStatusMeta(focusAppeal.status).label }}</el-tag>
          </div>

          <div class="metric-row">
            <span>供应商</span>
            <strong>{{ focusAppeal.supplierName }}</strong>
          </div>
          <div class="metric-row">
            <span>关联文件</span>
            <strong>{{ focusAppeal.fileName }}</strong>
          </div>
          <div class="metric-row">
            <span>文件类型</span>
            <strong>{{ documentTypeLabel(focusRecord?.category) }}</strong>
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
            <span>申诉截止</span>
            <strong>{{ focusAppeal.appealableUntil ? formatDate(focusAppeal.appealableUntil) : '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>复核人</span>
            <strong>{{ focusAppeal.assigneeName || '待指派' }}</strong>
          </div>
          <div class="metric-row">
            <span>指派时间</span>
            <strong>{{ focusAppeal.assignedAt ? formatDateTime(focusAppeal.assignedAt) : '--' }}</strong>
          </div>
          <div class="metric-row">
            <span>当前审核结论</span>
            <strong><StatusTag :status="focusRecord?.status || ''" /></strong>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">申诉摘要</div>
            <div class="suggestion-item">{{ focusAppeal.summary }}</div>
          </div>
          <div class="detail-block">
            <div class="section-subtitle">详细说明</div>
            <div class="suggestion-item">{{ focusAppeal.description }}</div>
          </div>
          <div v-if="focusRecord?.unmetClauses?.length" class="detail-block">
            <div class="section-subtitle">原未满足条款</div>
            <div class="capsule-list">
              <span v-for="item in focusRecord.unmetClauses" :key="item" class="capsule-item">{{ item }}</span>
            </div>
          </div>
          <div v-if="focusAppeal.attachments?.length" class="detail-block">
            <div class="section-subtitle">申诉材料</div>
            <div class="capsule-list">
              <span v-for="item in focusAppeal.attachments" :key="item.id" class="capsule-item">
                {{ item.name }} · {{ item.sizeMB }}MB
              </span>
            </div>
          </div>

          <div class="section-card action-card">
            <div class="panel-title">
              <div>
                <h3>处理动作</h3>
                <p>管理员可直接受理、要求补件、确认申诉成立或驳回申诉。</p>
              </div>
            </div>

            <el-form label-position="top">
              <el-form-item label="处理状态">
                <el-select v-model="actionForm.nextStatus">
                  <el-option label="开始复核" value="under_review" />
                  <el-option label="要求补充材料" value="supplement_required" />
                  <el-option label="申诉成立" value="accepted" />
                  <el-option label="申诉驳回" value="rejected" />
                  <el-option label="结案归档" value="closed" />
                </el-select>
              </el-form-item>

              <el-form-item label="处理意见">
                <el-input v-model="actionForm.feedback" type="textarea" :rows="4" />
              </el-form-item>

              <template v-if="actionForm.nextStatus === 'accepted'">
                <el-form-item label="调整后的审核结论">
                  <el-select v-model="actionForm.resultingRecordStatus">
                    <el-option label="通过" value="approved" />
                    <el-option label="有条件通过" value="conditional" />
                    <el-option label="未通过" value="rejected" />
                  </el-select>
                </el-form-item>
                <el-form-item label="调整后的审核意见">
                  <el-input v-model="actionForm.resultingOpinion" type="textarea" :rows="3" />
                </el-form-item>
                <el-form-item v-if="actionForm.resultingRecordStatus !== 'approved'" label="未满足条款">
                  <el-input v-model="actionForm.resultingClauses" type="textarea" :rows="3" placeholder="每行一条" />
                </el-form-item>
                <el-form-item v-if="actionForm.resultingRecordStatus !== 'approved'" label="整改建议">
                  <el-input v-model="actionForm.resultingSuggestions" type="textarea" :rows="3" placeholder="每行一条" />
                </el-form-item>
              </template>
            </el-form>

            <div class="toolbar" style="margin-top: 18px">
              <el-button type="primary" @click="submitAction">保存处理结果</el-button>
              <el-button plain @click="openRecordDetail">查看原审核详情</el-button>
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
        </template>

        <div v-else class="rich-empty">请选择一条申诉查看复核详情。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 18px;
}

.appeal-grid {
  grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.15fr);
  align-items: start;
}

.board-card,
.panel-card,
.action-card {
  padding: 20px;
}

.board-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.board-metric {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.92));
}

.board-metric span,
.board-row-head span {
  color: var(--text-muted);
  font-size: 12px;
}

.board-metric strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  line-height: 1.1;
  color: var(--text-primary);
}

.board-metric p,
.board-row p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.board-list {
  display: grid;
  gap: 14px;
}

.board-row {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(248, 251, 255, 0.88);
}

.board-row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 10px;
}

.board-bar-track {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(31, 115, 216, 0.12);
}

.board-bar-track-soft {
  background: rgba(215, 142, 49, 0.14);
}

.board-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f73d8, #59a1ff);
}

.board-bar-fill-warm {
  background: linear-gradient(90deg, #d7862f, #f0b267);
}

.compact-empty {
  min-height: 160px;
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

.appeal-list,
.timeline-list {
  display: grid;
  gap: 12px;
}

.appeal-item {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.9);
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

.appeal-item.selected {
  border-color: rgba(215, 134, 47, 0.42);
  box-shadow: 0 10px 24px rgba(215, 134, 47, 0.12);
}

.appeal-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.appeal-item-head-left {
  display: flex;
  gap: 10px;
  align-items: center;
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
  line-height: 1.7;
}

.action-card {
  margin-top: 18px;
}

@media (max-width: 1180px) {
  .dashboard-grid,
  .board-metric-grid,
  .appeal-grid {
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
