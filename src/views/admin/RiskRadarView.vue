<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import StatCard from '../../components/StatCard.vue'
import { formatDate, formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()
const selectedSupplierId = ref('')

const draftFilters = reactive({
  keyword: '',
  lifecycle: '',
  riskLevel: '',
})

const appliedFilters = reactive({
  keyword: '',
  lifecycle: '',
  riskLevel: '',
})

const lifecycleOptions = [
  { label: '正常', value: 'active' },
  { label: '重点观察', value: 'watch' },
  { label: '已冻结', value: 'frozen' },
]

function supplierTypeLabel(value) {
  return standardsStore.supplierTypes.find((item) => item.value === value)?.label || value
}

function lifecycleMeta(status) {
  return {
    active: { label: '正常', type: 'success' },
    watch: { label: '重点观察', type: 'warning' },
    frozen: { label: '已冻结', type: 'danger' },
  }[status] || { label: status || '未知', type: 'info' }
}

function riskLevelMeta(level) {
  return {
    critical: { label: '高风险', type: 'danger' },
    high: { label: '重点关注', type: 'warning' },
    medium: { label: '跟进观察', type: '' },
    low: { label: '低风险', type: 'success' },
  }[level] || { label: '低风险', type: 'success' }
}

function buildSupplierRadarRow(supplier) {
  const records = reviewsStore.recordsBySupplier(supplier.id)
  const riskRecords = reviewsStore.riskRecordsBySupplier(supplier.id)
  const appeals = reviewsStore.appealsBySupplier(supplier.id)
  const highestRiskRank = riskRecords[0]?.riskStatus?.rank || 0
  const expiredCount = records.filter((item) => item.renewalState.level === 'expired').length
  const expiringCount = records.filter((item) => ['expiring', 'urgent-expiring'].includes(item.renewalState.level)).length
  const sameSourceHits = records.reduce((sum, item) => sum + (item.sameSourceMatches?.length || 0), 0)
  const latestRecord = records[0]
  const alertLabels = []

  riskRecords.forEach((record) => {
    record.riskAlerts.forEach((alert) => {
      if (!alertLabels.includes(alert.label)) {
        alertLabels.push(alert.label)
      }
    })
  })

  const riskScore = Math.min(
    100,
    highestRiskRank * 18 +
      expiredCount * 24 +
      expiringCount * 12 +
      appeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length * 8 +
      Math.min(sameSourceHits, 3) * 7,
  )

  const riskLevel =
    supplier.lifecycle.status === 'frozen'
      ? 'critical'
      : riskScore >= 70
        ? 'critical'
        : riskScore >= 45
          ? 'high'
          : riskScore >= 20
            ? 'medium'
            : 'low'

  return {
    id: supplier.id,
    supplierName: supplier.enterprise.enterpriseName,
    supplierType: supplier.enterprise.supplierType,
    supplierTypeLabel: supplierTypeLabel(supplier.enterprise.supplierType),
    lifecycleStatus: supplier.lifecycle.status,
    lifecycleMeta: lifecycleMeta(supplier.lifecycle.status),
    archiveSource: supplier.lifecycle.archiveSource,
    lastRiskScanAt: supplier.lifecycle.lastRiskScanAt,
    latestReviewTrigger: supplier.lifecycle.latestReviewTrigger,
    freezeReason: supplier.lifecycle.freezeReason,
    tags: supplier.lifecycle.tags || [],
    lifecycleLogs: supplier.lifecycle.lifecycleLogs || [],
    recordCount: records.length,
    riskRecordCount: riskRecords.length,
    expiredCount,
    expiringCount,
    sameSourceHits,
    appealActiveCount: appeals.filter((item) => ['submitted', 'under_review', 'supplement_required'].includes(item.status)).length,
    riskLevel,
    riskLevelMeta: riskLevelMeta(riskLevel),
    riskScore,
    latestRecord,
    topAlerts: alertLabels.slice(0, 4),
    riskRecords,
  }
}

const radarRows = computed(() => suppliersStore.suppliers.map(buildSupplierRadarRow).sort((a, b) => b.riskScore - a.riskScore))

const filteredRows = computed(() =>
  radarRows.value.filter((item) => {
    const keyword = normalizeKeyword(appliedFilters.keyword)
    const keywordMatched =
      !keyword ||
      normalizeKeyword(item.supplierName).includes(keyword) ||
      normalizeKeyword(item.supplierTypeLabel).includes(keyword) ||
      normalizeKeyword(item.topAlerts.join(' ')).includes(keyword)
    const lifecycleMatched = !appliedFilters.lifecycle || item.lifecycleStatus === appliedFilters.lifecycle
    const riskMatched = !appliedFilters.riskLevel || item.riskLevel === appliedFilters.riskLevel
    return keywordMatched && lifecycleMatched && riskMatched
  }),
)

const focusSupplier = computed(() => {
  const fromFiltered = filteredRows.value.find((item) => item.id === selectedSupplierId.value)
  if (fromFiltered) return fromFiltered
  return filteredRows.value[0] || radarRows.value[0]
})

const totalRiskSuppliers = computed(() => radarRows.value.filter((item) => item.riskLevel !== 'low').length)
const frozenSupplierCount = computed(() => radarRows.value.filter((item) => item.lifecycleStatus === 'frozen').length)
const expiredRecordCount = computed(() => radarRows.value.reduce((sum, item) => sum + item.expiredCount, 0))
const triggeredReviewCount = computed(() => radarRows.value.filter((item) => item.latestReviewTrigger).length)

function applyFilters() {
  Object.assign(appliedFilters, draftFilters)
}

function resetFilters() {
  Object.assign(draftFilters, {
    keyword: '',
    lifecycle: '',
    riskLevel: '',
  })
  Object.assign(appliedFilters, {
    keyword: '',
    lifecycle: '',
    riskLevel: '',
  })
}

function setFocusSupplier(row) {
  if (!row) return
  selectedSupplierId.value = row.id
}

function toggleFreeze(row) {
  try {
    if (row.lifecycleStatus === 'frozen') {
      suppliersStore.updateLifecycleStatus(row.id, {
        status: 'active',
        reason: '管理员解除冻结，等待后续常态巡检。',
        operatorName: authStore.displayName,
        source: 'risk-radar',
      })
      ElMessage.success('供应商已解除冻结。')
    } else {
      suppliersStore.updateLifecycleStatus(row.id, {
        status: 'frozen',
        reason: row.topAlerts[0] ? `命中风险：${row.topAlerts[0]}` : '命中高风险规则，先行冻结。',
        operatorName: authStore.displayName,
        source: 'risk-radar',
      })
      ElMessage.success('供应商已冻结，并记录至生命周期日志。')
    }
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function markWatch(row) {
  try {
    suppliersStore.updateLifecycleStatus(row.id, {
      status: 'watch',
      reason: row.topAlerts[0] ? `进入重点观察：${row.topAlerts[0]}` : '存在中高风险项，纳入重点观察。',
      operatorName: authStore.displayName,
      source: 'risk-radar',
    })
    suppliersStore.updateSupplierTags(row.id, row.topAlerts.slice(0, 3))
    ElMessage.success('供应商已标记为重点观察。')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function triggerRereview(row) {
  try {
    suppliersStore.triggerSupplierRereview(row.id, {
      operatorName: authStore.displayName,
      reason: row.topAlerts[0] ? `因“${row.topAlerts[0]}”触发变更重审` : '因动态风控结果触发变更重审',
    })
    ElMessage.success('已记录重审触发动作。')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function openSupplierManagement(row) {
  router.push(`/admin/suppliers?supplierId=${row.id}`)
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>动态风控雷达</h1>
        <p>集中查看存量供应商风险、冻结状态、重审触发与电子档案摘要，先把全生命周期管理入口立起来。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="风险供应商" :value="totalRiskSuppliers" hint="存在证书风险、同源风险或申诉积压的供应商" tone="danger" />
      <StatCard label="已冻结供应商" :value="frozenSupplierCount" hint="当前受限、需更新资质后再复核的供应商" />
      <StatCard label="过期证书" :value="expiredRecordCount" hint="动态巡检命中的已过期资质文件数量" tone="danger" />
      <StatCard label="已触发重审" :value="triggeredReviewCount" hint="通过风控页显式触发的复审或变更重审动作" tone="success" />
    </div>

    <div class="content-grid radar-grid">
      <div class="section-card panel-card">
        <div class="toolbar" style="margin-bottom: 16px">
          <el-input v-model="draftFilters.keyword" placeholder="搜索供应商、供方类型或风险标签" clearable style="max-width: 280px" />
          <el-select v-model="draftFilters.lifecycle" placeholder="生命周期状态" clearable style="width: 180px">
            <el-option v-for="item in lifecycleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="draftFilters.riskLevel" placeholder="风险等级" clearable style="width: 180px">
            <el-option label="高风险" value="critical" />
            <el-option label="重点关注" value="high" />
            <el-option label="跟进观察" value="medium" />
            <el-option label="低风险" value="low" />
          </el-select>
          <el-button type="primary" @click="applyFilters">搜索</el-button>
          <el-button plain @click="resetFilters">重置</el-button>
        </div>

        <div v-if="filteredRows.length" class="supplier-list">
          <button
            v-for="item in filteredRows"
            :key="item.id"
            type="button"
            class="supplier-item"
            :class="{ active: focusSupplier?.id === item.id }"
            @click="setFocusSupplier(item)"
          >
            <div class="supplier-item-head">
              <div>
                <strong>{{ item.supplierName }}</strong>
                <p>{{ item.supplierTypeLabel }} · {{ item.recordCount }} 份档案</p>
              </div>
              <el-tag :type="item.riskLevelMeta.type">{{ item.riskLevelMeta.label }}</el-tag>
            </div>
            <div class="capsule-list">
              <el-tag :type="item.lifecycleMeta.type">{{ item.lifecycleMeta.label }}</el-tag>
              <span v-for="tag in item.topAlerts" :key="tag" class="capsule-item">{{ tag }}</span>
            </div>
            <div class="supplier-item-metrics">
              <span>风险分 {{ item.riskScore }}</span>
              <span>过期 {{ item.expiredCount }}</span>
              <span>临期 {{ item.expiringCount }}</span>
              <span>申诉 {{ item.appealActiveCount }}</span>
            </div>
          </button>
        </div>
        <div v-else class="rich-empty">当前没有符合条件的供应商风险记录。</div>
      </div>

      <div class="section-card panel-card detail-panel">
        <template v-if="focusSupplier">
          <div class="panel-title">
            <div>
              <h3>{{ focusSupplier.supplierName }}</h3>
              <p>{{ focusSupplier.supplierTypeLabel }} · 最近巡检 {{ formatDateTime(focusSupplier.lastRiskScanAt) }}</p>
            </div>
            <div class="toolbar">
              <el-tag :type="focusSupplier.lifecycleMeta.type">{{ focusSupplier.lifecycleMeta.label }}</el-tag>
              <el-tag :type="focusSupplier.riskLevelMeta.type">{{ focusSupplier.riskLevelMeta.label }}</el-tag>
            </div>
          </div>

          <div class="metric-row">
            <span>电子档案来源</span>
            <strong>{{ focusSupplier.archiveSource === 'admin-created' ? '管理员建档' : '供应商门户建档' }}</strong>
          </div>
          <div class="metric-row">
            <span>当前风险分</span>
            <strong>{{ focusSupplier.riskScore }}</strong>
          </div>
          <div class="metric-row">
            <span>最新重审触发</span>
            <strong>{{ focusSupplier.latestReviewTrigger || '--' }}</strong>
          </div>
          <div class="metric-row" v-if="focusSupplier.freezeReason">
            <span>冻结原因</span>
            <strong class="danger-note">{{ focusSupplier.freezeReason }}</strong>
          </div>

          <div class="section-card action-card">
            <div class="panel-title">
              <div>
                <h3>风控动作</h3>
                <p>先把冻结、重点观察和重审触发这些主动作放到同一入口，便于后续继续扩展。</p>
              </div>
            </div>
            <div class="toolbar">
              <el-button type="danger" plain @click="toggleFreeze(focusSupplier)">
                {{ focusSupplier.lifecycleStatus === 'frozen' ? '解除冻结' : '立即冻结' }}
              </el-button>
              <el-button type="warning" plain @click="markWatch(focusSupplier)">设为重点观察</el-button>
              <el-button type="primary" @click="triggerRereview(focusSupplier)">触发重审</el-button>
              <el-button plain @click="openSupplierManagement(focusSupplier)">打开供应商档案</el-button>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">核心风险标签</div>
            <div class="capsule-list">
              <span v-for="tag in focusSupplier.topAlerts" :key="tag" class="capsule-item">{{ tag }}</span>
              <span v-if="!focusSupplier.topAlerts.length" class="status-text">当前暂无明显风险标签</span>
            </div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">高风险档案</div>
            <div v-if="focusSupplier.riskRecords.length" class="risk-record-list">
              <div v-for="record in focusSupplier.riskRecords.slice(0, 5)" :key="record.id" class="risk-record-item">
                <div class="risk-record-head">
                  <strong>{{ record.fileName }}</strong>
                  <el-tag :type="record.riskStatus.type">{{ record.riskStatus.label }}</el-tag>
                </div>
                <p>{{ record.riskAlerts.map((item) => item.label).join('、') || '暂无风险标签' }}</p>
                <span>有效期 {{ formatDate(record.extractedFields.validUntil) }} · 审核状态 {{ record.status }}</span>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前没有高风险档案。</div>
          </div>

          <div class="detail-block">
            <div class="section-subtitle">生命周期日志</div>
            <div v-if="focusSupplier.lifecycleLogs.length" class="timeline-list">
              <div v-for="item in focusSupplier.lifecycleLogs" :key="item.id" class="timeline-item">
                <strong>{{ item.action }}</strong>
                <span>{{ item.actor }} · {{ formatDateTime(item.at) }}</span>
                <p>{{ item.note }}</p>
              </div>
            </div>
            <div v-else class="rich-empty compact-empty">当前还没有生命周期操作记录。</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.radar-grid {
  grid-template-columns: minmax(340px, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
}

.panel-card,
.action-card {
  padding: 20px;
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

.supplier-list,
.risk-record-list,
.timeline-list {
  display: grid;
  gap: 12px;
}

.supplier-item {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: 0.2s ease;
}

.supplier-item:hover,
.supplier-item.active {
  border-color: rgba(31, 115, 216, 0.35);
  box-shadow: 0 10px 24px rgba(24, 64, 116, 0.08);
  transform: translateY(-1px);
}

.supplier-item-head,
.risk-record-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.supplier-item-head p,
.risk-record-item p,
.timeline-item p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.supplier-item-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
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

.risk-record-item,
.timeline-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid var(--line-soft);
}

.risk-record-item span,
.timeline-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.action-card {
  margin-top: 18px;
}

.compact-empty {
  min-height: 120px;
}

@media (max-width: 1180px) {
  .radar-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }
}
</style>
watch(
  filteredRows,
  (value) => {
    if (!value.length) {
      selectedSupplierId.value = ''
      return
    }

    if (!value.some((item) => item.id === selectedSupplierId.value)) {
      selectedSupplierId.value = value[0].id
    }
  },
  { immediate: true },
)
