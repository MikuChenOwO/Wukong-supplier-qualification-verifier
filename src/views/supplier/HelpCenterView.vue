<script setup>
import { computed, ref } from 'vue'
import { useStandardsStore } from '../../stores/standards'

const standardsStore = useStandardsStore()

const activeFaqCategory = ref('全部')
const activeCaseCategory = ref('全部')
const activeCaseResult = ref('all')

const filteredFaqs = computed(() =>
  activeFaqCategory.value === '全部'
    ? standardsStore.knowledgeBase
    : standardsStore.knowledgeBase.filter((item) => item.category === activeFaqCategory.value),
)

const filteredCases = computed(() =>
  standardsStore.caseLibrary.filter((item) => {
    const categoryMatch = activeCaseCategory.value === '全部' || item.caseCategory === activeCaseCategory.value
    const resultMatch = activeCaseResult.value === 'all' || item.result === activeCaseResult.value
    return categoryMatch && resultMatch
  }),
)

const caseResultOptions = [
  { label: '全部结果', value: 'all' },
  { label: '已通过', value: 'approved' },
  { label: '有条件通过', value: 'conditional' },
  { label: '未通过', value: 'rejected' },
]

function resolveSupplierTypeLabel(value) {
  return standardsStore.supplierTypes.find((item) => item.value === value)?.label || value
}

function caseStatusMeta(status) {
  return {
    approved: { label: '已通过', type: 'success' },
    conditional: { label: '有条件通过', type: 'warning' },
    rejected: { label: '未通过', type: 'danger' },
  }[status] || { label: '审核中', type: 'info' }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>帮助中心</h1>
        <p>汇总审核指南、FAQ、流程解读与典型案例，帮助供应商在上传前先完成一轮自查。</p>
      </div>
    </div>

    <div class="stat-grid">
      <div class="section-card stat-panel">
        <span>FAQ 条目</span>
        <strong>{{ standardsStore.knowledgeBase.length }}</strong>
        <p>覆盖注册填报、审核结论、申诉与动态风控等高频问题。</p>
      </div>
      <div class="section-card stat-panel">
        <span>案例样本</span>
        <strong>{{ standardsStore.caseLibrary.length }}</strong>
        <p>包含通过、补件跟进、未通过和申诉纠偏等典型场景。</p>
      </div>
      <div class="section-card stat-panel">
        <span>高频补件场景</span>
        <strong>{{ standardsStore.caseLibrary.filter((item) => item.result === 'conditional').length }}</strong>
        <p>重点关注盖章页缺失、授权链路不完整和范围待核实。</p>
      </div>
    </div>

    <div class="section-card help-card">
      <div class="panel-title">
        <h3>审核流程解读</h3>
      </div>
      <el-steps :active="4" finish-status="success">
        <el-step title="资料准备" description="填写企业信息、上传证照、确认团队与关联主体信息" />
        <el-step title="机器预审" description="执行有效期、字段比对、风险标记和自动评分" />
        <el-step title="人工审核" description="管理员复核结果、补充意见并形成审核结论" />
        <el-step title="结果归档" description="同步供应商端，触发通知、申诉或后续重审提醒" />
      </el-steps>
    </div>

    <div class="section-card help-card">
      <div class="panel-title">
        <div>
          <h3>FAQ</h3>
          <p>先看规则和口径，再决定是补件、申诉还是等待管理员复核。</p>
        </div>
      </div>

      <el-radio-group v-model="activeFaqCategory" size="small" class="filter-group">
        <el-radio-button
          v-for="item in standardsStore.faqCategories"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-radio-group>

      <div class="faq-grid">
        <div v-for="item in filteredFaqs" :key="item.id" class="section-card faq-card">
          <div class="faq-head">
            <el-tag effect="plain">{{ item.category }}</el-tag>
          </div>
          <h3>{{ item.title }}</h3>
          <p class="faq-summary">{{ item.summary }}</p>
          <p class="faq-answer">{{ item.answer }}</p>
          <div class="capsule-list">
            <span v-for="tag in item.tags" :key="tag" class="capsule-item">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card help-card">
      <div class="panel-title">
        <div>
          <h3>案例库</h3>
          <p>用真实业务场景帮助供应商判断当前资料更接近“直接通过”“补件跟进”还是“需要申诉纠偏”。</p>
        </div>
      </div>

      <div class="filter-stack">
        <el-radio-group v-model="activeCaseCategory" size="small" class="filter-group">
          <el-radio-button
            v-for="item in standardsStore.caseCategories"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-radio-group>
        <el-radio-group v-model="activeCaseResult" size="small" class="filter-group">
          <el-radio-button
            v-for="item in caseResultOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-radio-group>
      </div>

      <div class="case-grid">
        <div v-for="item in filteredCases" :key="item.id" class="section-card case-card">
          <div class="case-head">
            <div>
              <h3>{{ item.title }}</h3>
              <div class="case-meta">
                <el-tag effect="plain">{{ item.caseCategory }}</el-tag>
                <el-tag type="info" effect="plain">{{ resolveSupplierTypeLabel(item.supplierType) }}</el-tag>
                <el-tag :type="caseStatusMeta(item.result).type">{{ caseStatusMeta(item.result).label }}</el-tag>
              </div>
            </div>
          </div>
          <p class="case-summary">{{ item.summary }}</p>
          <div class="case-detail">
            <strong>典型问题</strong>
            <p>{{ item.issueSummary }}</p>
          </div>
          <div class="case-detail">
            <strong>处理动作</strong>
            <ul>
              <li v-for="action in item.actions" :key="action">{{ action }}</li>
            </ul>
          </div>
          <div class="case-detail">
            <strong>经验结论</strong>
            <p>{{ item.takeaway }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-card,
.faq-card,
.case-card,
.stat-panel {
  padding: 20px;
}

.panel-title {
  margin-bottom: 14px;
}

.panel-title h3,
.faq-card h3,
.case-card h3 {
  margin: 0 0 10px;
}

.panel-title p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.stat-panel span {
  color: var(--text-muted);
  font-size: 13px;
}

.stat-panel strong {
  display: block;
  margin: 14px 0 10px;
  font-size: 34px;
}

.stat-panel p,
.faq-summary,
.faq-answer,
.case-summary,
.case-detail p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}

.filter-stack {
  display: grid;
  gap: 12px;
}

.filter-group {
  margin-bottom: 16px;
}

.faq-grid,
.case-grid {
  display: grid;
  gap: 14px;
}

.faq-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.case-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.faq-head,
.case-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.faq-summary,
.case-summary {
  margin-bottom: 10px;
}

.faq-answer {
  margin-bottom: 14px;
}

.case-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-detail + .case-detail {
  margin-top: 12px;
}

.case-detail strong {
  display: block;
  margin-bottom: 6px;
}

.case-detail ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 1100px) {
  .faq-grid,
  .case-grid {
    grid-template-columns: 1fr;
  }
}
</style>
