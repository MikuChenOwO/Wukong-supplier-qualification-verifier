<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import FilePreviewPane from '../../components/FilePreviewPane.vue'
import ComparisonTable from '../../components/ComparisonTable.vue'
import ScoreSummary from '../../components/ScoreSummary.vue'
import StatusTag from '../../components/StatusTag.vue'
import MachineBadge from '../../components/MachineBadge.vue'

const route = useRoute()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()
const loading = ref(false)

const record = computed(() => reviewsStore.getRecord(route.params.id))
const supplier = computed(() => suppliersStore.currentSupplier(record.value?.supplierId))
const threshold = computed(() => standardsStore.resolveThreshold(supplier.value?.enterprise))

const reviewForm = reactive({
  status: 'approved',
  opinion: '',
  quality: 0,
  technical: 0,
  business: 0,
  bonus: 0,
})

watch(
  record,
  (value) => {
    if (!value) return
    reviewForm.status = value.status
    reviewForm.opinion = value.adminOpinion || ''
    reviewForm.quality = value.scoreBreakdown.quality
    reviewForm.technical = value.scoreBreakdown.technical
    reviewForm.business = value.scoreBreakdown.business
    reviewForm.bonus = value.scoreBreakdown.bonus
  },
  { immediate: true },
)

const totalScore = computed(() => {
  const template = standardsStore.findTemplateById(record.value?.standardTemplateId)
  if (!template) return 0
  return Math.round(
    reviewForm.quality * template.weights.quality +
      reviewForm.technical * template.weights.technical +
      reviewForm.business * template.weights.business +
      reviewForm.bonus,
  )
})

function submitReview() {
  loading.value = true
  setTimeout(() => {
    try {
      reviewsStore.reviewDocument({
        recordId: record.value.id,
        reviewerName: authStore.displayName,
        status: reviewForm.status,
        opinion: reviewForm.opinion,
        scoreBreakdown: {
          quality: reviewForm.quality,
          technical: reviewForm.technical,
          business: reviewForm.business,
          bonus: reviewForm.bonus,
          total: totalScore.value,
        },
      })
      ElMessage.success('审核结果已提交，并同步至供应商端。')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      loading.value = false
    }
  }, 700)
}
</script>

<template>
  <div v-if="record" class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核详情工作台</h1>
        <p>集中查看供应商信息、文件预览、字段比对、同源筛查和评分面板，完成最终审核动作。</p>
      </div>
      <div class="toolbar">
        <MachineBadge :status="record.machineStatus" :score="record.precheckScore" />
        <StatusTag :status="record.status" />
      </div>
    </div>

    <div class="content-grid two-col">
      <FilePreviewPane :preview-url="record.previewUrl" :mime-type="record.mimeType" :title="record.fileName" />
      <div class="content-grid">
        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>供应商信息</h3>
          </div>
          <div class="metric-row">
            <span>供应商名称</span>
            <strong>{{ supplier?.enterprise.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ supplier?.enterprise.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>供应商类型</span>
            <strong>{{ standardsStore.supplierTypes.find((item) => item.value === supplier?.enterprise.supplierType)?.label }}</strong>
          </div>
          <div class="metric-row">
            <span>任务号</span>
            <strong>{{ record.taskNo }}</strong>
          </div>
        </div>

        <ScoreSummary
          :score="{
            quality: reviewForm.quality,
            technical: reviewForm.technical,
            business: reviewForm.business,
            bonus: reviewForm.bonus,
            total: totalScore,
          }"
          :threshold="threshold"
        />

        <div class="section-card detail-card">
          <div class="panel-title">
            <h3>风险与同源命中</h3>
          </div>
          <div v-if="record.riskFlags.length" class="capsule-list">
            <span v-for="item in record.riskFlags" :key="item" class="capsule-item">{{ item }}</span>
          </div>
          <div v-else class="rich-empty">当前无风险标记。</div>
          <div class="soft-divider" />
          <div v-if="record.sameSourceMatches.length">
            <div v-for="item in record.sameSourceMatches" :key="`${item.person}-${item.matchedCompany}`" class="metric-row">
              <span>{{ item.person }} / {{ item.relation }}</span>
              <strong>{{ item.matchedCompany }}</strong>
            </div>
          </div>
          <div v-else class="rich-empty">未命中同源主体。</div>
        </div>
      </div>
    </div>

    <ComparisonTable :rows="record.comparisons" />

    <div class="section-card detail-card">
      <div class="panel-title">
        <h3>审核操作</h3>
      </div>
      <div class="form-grid">
        <div>
          <el-form label-position="top">
            <el-form-item label="审核结论">
              <el-radio-group v-model="reviewForm.status" :disabled="record.status === 'approved'">
                <el-radio label="approved">通过</el-radio>
                <el-radio label="rejected">未通过</el-radio>
                <el-radio label="pending">保持审核中</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input
                v-model="reviewForm.opinion"
                type="textarea"
                :rows="4"
                placeholder="未通过时必须填写原因，也可写改进建议。"
                :disabled="record.status === 'approved'"
              />
            </el-form-item>
          </el-form>
        </div>
        <div class="score-form">
          <div class="metric-row">
            <span>质量部分</span>
            <el-input-number v-model="reviewForm.quality" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>技术部分</span>
            <el-input-number v-model="reviewForm.technical" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>商务部分</span>
            <el-input-number v-model="reviewForm.business" :min="0" :max="100" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>加分项</span>
            <el-input-number v-model="reviewForm.bonus" :min="0" :max="5" :disabled="record.status === 'approved'" />
          </div>
          <div class="metric-row">
            <span>准入门槛</span>
            <strong>{{ threshold }} 分</strong>
          </div>
          <div class="metric-row">
            <span>当前汇总</span>
            <strong>{{ totalScore }} 分</strong>
          </div>
        </div>
      </div>
      <div class="toolbar" style="margin-top: 18px">
        <el-button type="primary" :loading="loading" :disabled="record.status === 'approved'" @click="submitReview">
          提交审核
        </el-button>
        <span class="status-text">已通过文件锁定不可重复审核，管理员仅可填写审核结果与意见。</span>
      </div>
    </div>
  </div>
  <div v-else class="rich-empty">未找到该审核记录。</div>
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

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
}

.score-form {
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.82);
  padding: 14px 16px;
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
