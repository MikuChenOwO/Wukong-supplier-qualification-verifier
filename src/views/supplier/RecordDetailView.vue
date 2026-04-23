<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import FilePreviewPane from '../../components/FilePreviewPane.vue'
import ComparisonTable from '../../components/ComparisonTable.vue'
import ScoreSummary from '../../components/ScoreSummary.vue'
import MachineBadge from '../../components/MachineBadge.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDateTime } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const record = computed(() => reviewsStore.getRecord(route.params.id))
const supplier = computed(() => suppliersStore.currentSupplier(record.value?.supplierId))
const threshold = computed(() => standardsStore.resolveThreshold(supplier.value?.enterprise))
</script>

<template>
  <div v-if="record" class="content-grid">
    <div class="page-title">
      <div>
        <h1>核验详情</h1>
        <p>查看文件在线预览、识别字段、标准比对结果、同源筛查、管理员意见与最终状态。</p>
      </div>
      <div class="toolbar">
        <MachineBadge :status="record.machineStatus" :score="record.precheckScore" />
        <StatusTag :status="record.status" />
        <el-button v-if="record.status === 'rejected'" type="primary" @click="router.push(`/supplier/upload?reupload=${record.id}&category=${record.category}`)">
          重新上传
        </el-button>
      </div>
    </div>

    <div class="content-grid two-col">
      <FilePreviewPane :preview-url="record.previewUrl" :mime-type="record.mimeType" :title="record.fileName" />
      <div class="content-grid">
        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>任务概况</h3>
          </div>
          <div class="metric-row">
            <span>审核任务号</span>
            <strong>{{ record.taskNo }}</strong>
          </div>
          <div class="metric-row">
            <span>上传时间</span>
            <strong>{{ formatDateTime(record.uploadedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>审核时间</span>
            <strong>{{ formatDateTime(record.reviewedAt) }}</strong>
          </div>
          <div class="metric-row">
            <span>审核人</span>
            <strong>{{ record.reviewerName || '待分配' }}</strong>
          </div>
          <div class="metric-row">
            <span>管理员意见</span>
            <strong>{{ record.adminOpinion || '待审核' }}</strong>
          </div>
        </div>

        <ScoreSummary :score="record.scoreBreakdown" :threshold="threshold" />

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>机器识别字段</h3>
          </div>
          <div class="metric-row">
            <span>企业名称</span>
            <strong>{{ record.extractedFields.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ record.extractedFields.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>法人</span>
            <strong>{{ record.extractedFields.legalPerson }}</strong>
          </div>
          <div class="metric-row">
            <span>证书有效期</span>
            <strong>{{ record.extractedFields.validUntil }}</strong>
          </div>
          <div class="metric-row">
            <span>认证范围</span>
            <strong>{{ record.extractedFields.certificationScope }}</strong>
          </div>
        </div>
      </div>
    </div>

    <ComparisonTable :rows="record.comparisons" />

    <div class="content-grid two-col">
      <div class="section-card detail-card">
        <div class="panel-title">
          <h3>风险标记</h3>
        </div>
        <div v-if="record.riskFlags.length" class="capsule-list">
          <span v-for="item in record.riskFlags" :key="item" class="capsule-item">{{ item }}</span>
        </div>
        <div v-else class="rich-empty">当前无风险标记。</div>
      </div>

      <div class="section-card detail-card">
        <div class="panel-title">
          <h3>同源筛查结果</h3>
        </div>
        <div v-if="record.sameSourceMatches.length">
          <div v-for="item in record.sameSourceMatches" :key="`${item.person}-${item.matchedCompany}`" class="metric-row">
            <span>{{ item.person }} / {{ item.relation }}</span>
            <strong>{{ item.matchedCompany }}（{{ item.riskLevel }}风险）</strong>
          </div>
        </div>
        <div v-else class="rich-empty">未命中同源主体。</div>
      </div>
    </div>
  </div>
  <div v-else class="rich-empty">未找到对应记录。</div>
</template>

<style scoped>
.detail-card {
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
</style>
