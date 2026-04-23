<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import StatCard from '../../components/StatCard.vue'
import { formatDateTime, formatDate } from '../../utils/format'

const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const suppliersStore = useSuppliersStore()
const standardsStore = useStandardsStore()

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const records = computed(() => reviewsStore.recordsBySupplier(authStore.userId))
const approvedCount = computed(() => records.value.filter((item) => item.status === 'approved').length)
const pendingCount = computed(() => records.value.filter((item) => item.status === 'pending').length)
const riskCount = computed(() => records.value.filter((item) => item.riskFlags.length).length)
const latestApproved = computed(() => reviewsStore.latestApprovedRecordBySupplier(authStore.userId))
const nextReviewAt = computed(() => latestApproved.value?.nextReviewAt || '')
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商总览</h1>
        <p>
          这里集中展示企业档案完整度、当前审核模板、机器预审结果和复评提醒，帮助供应商快速掌握资质审核进度。
        </p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="累计资质文件" :value="records.length" hint="当前企业全部上传记录" />
      <StatCard label="审核通过" :value="approvedCount" hint="通过后自动锁定，保留历史记录" tone="success" />
      <StatCard label="审核中" :value="pendingCount" hint="管理员待审核文件数量" />
      <StatCard label="风险标记" :value="riskCount" hint="证书临期、字段不一致或同源命中" tone="danger" />
    </div>

    <div class="content-grid two-col">
      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>当前审核任务与模板</h3>
          <el-tag type="warning">{{ currentTemplate?.version || '--' }}</el-tag>
        </div>
        <div class="metric-row">
          <span>企业名称</span>
          <strong>{{ supplier?.enterprise.enterpriseName }}</strong>
        </div>
        <div class="metric-row">
          <span>供应商类型</span>
          <strong>{{ standardsStore.supplierTypes.find((item) => item.value === supplier?.enterprise.supplierType)?.label }}</strong>
        </div>
        <div class="metric-row">
          <span>准入模板</span>
          <strong>{{ currentTemplate?.name }}</strong>
        </div>
        <div class="metric-row">
          <span>准入门槛</span>
          <strong>{{ currentTemplate?.threshold || standardsStore.resolveThreshold(supplier?.enterprise) }} 分</strong>
        </div>
        <div class="metric-row">
          <span>上次通过时间</span>
          <strong>{{ formatDateTime(latestApproved?.reviewedAt || latestApproved?.uploadedAt) }}</strong>
        </div>
        <div class="metric-row">
          <span>预计复评提醒</span>
          <strong>{{ nextReviewAt ? formatDate(nextReviewAt) : '待生成' }}</strong>
        </div>
        <div class="soft-divider" />
        <el-steps :active="pendingCount ? 2 : approvedCount ? 4 : 1" finish-status="success">
          <el-step title="资料准备" />
          <el-step title="机器预审" />
          <el-step title="管理员审核" />
          <el-step title="结果归档" />
        </el-steps>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>同源筛查与提醒</h3>
          <el-tag v-if="records[0]?.sameSourceMatches?.length" type="danger">已命中</el-tag>
          <el-tag v-else type="success">正常</el-tag>
        </div>
        <div v-if="records[0]?.sameSourceMatches?.length">
          <div
            v-for="item in records[0].sameSourceMatches"
            :key="`${item.person}-${item.matchedCompany}`"
            class="metric-row"
          >
            <span>{{ item.person }} / {{ item.relation }}</span>
            <strong>{{ item.matchedCompany }}</strong>
          </div>
        </div>
        <div v-else class="rich-empty">当前暂无同源命中记录。</div>
        <div class="soft-divider" />
        <div class="capsule-list">
          <span class="capsule-item">信息变更会记录历史</span>
          <span class="capsule-item">未通过必须重新上传</span>
          <span class="capsule-item">管理员不可改原始文件</span>
        </div>
      </div>
    </div>

    <div class="content-grid two-col">
      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>最近核验记录</h3>
          <el-button text @click="$router.push('/supplier/records')">查看全部</el-button>
        </div>
        <el-table :data="records.slice(0, 5)" class="app-table" stripe>
          <el-table-column prop="taskNo" label="任务号" min-width="140" />
          <el-table-column prop="fileName" label="文件名称" min-width="200" />
          <el-table-column prop="precheckScore" label="预审分" min-width="90" />
          <el-table-column label="状态" min-width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">
                {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '未通过' : '审核中' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="section-card overview-panel">
        <div class="panel-title">
          <h3>帮助与知识库</h3>
          <el-button text @click="$router.push('/supplier/help')">查看全部</el-button>
        </div>
        <div v-for="item in standardsStore.knowledgeBase.slice(0, 3)" :key="item.id" class="faq-item">
          <strong>{{ item.title }}</strong>
          <p>{{ item.summary }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-panel {
  padding: 20px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0;
}

.faq-item + .faq-item {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(31, 76, 128, 0.16);
}

.faq-item p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.8;
}
</style>
