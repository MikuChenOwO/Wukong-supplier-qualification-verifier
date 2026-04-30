<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Object, required: true },
  threshold: { type: Number, default: 80 },
  vetoHit: { type: Boolean, default: false },
})

const passState = computed(() => props.score.total >= props.threshold && !props.vetoHit)
const gap = computed(() => Math.max(props.threshold - props.score.total, 0))

const scoreRows = computed(() => [
  { label: '质量部分', value: props.score.quality, max: 100 },
  { label: '技术部分', value: props.score.technical, max: 100 },
  { label: '商务部分', value: props.score.business, max: 100 },
  { label: '加分项', value: props.score.bonus, max: 5 },
])

function percent(value, max) {
  return Math.min(100, Math.round((value / max) * 100))
}
</script>

<template>
  <div class="score-summary section-card">
    <div class="header-row">
      <div>
        <h3>评分摘要</h3>
        <p>把各维度分数、达标情况和一票否决风险放在一起，方便快速判断是否可直接通过。</p>
      </div>
      <div class="score-pill" :class="{ pass: passState, veto: vetoHit }">
        {{ score.total }} 分 / 门槛 {{ threshold }} 分
      </div>
    </div>

    <el-alert
      v-if="vetoHit"
      type="error"
      :closable="false"
      title="当前命中一票否决项，即使总分达标也不能直接审核通过。"
      class="summary-alert"
    />
    <el-alert
      v-else-if="!passState"
      type="warning"
      :closable="false"
      :title="`当前距离准入门槛还差 ${gap} 分，建议补充审核意见或整改要求。`"
      class="summary-alert"
    />
    <el-alert
      v-else
      type="success"
      :closable="false"
      title="当前分数达到准入门槛，且未命中一票否决项。"
      class="summary-alert"
    />

    <div class="score-list">
      <div v-for="item in scoreRows" :key="item.label" class="score-row">
        <div class="score-row-head">
          <span>{{ item.label }}</span>
          <strong>{{ item.label === '加分项' ? `+${item.value}` : item.value }}</strong>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" :style="{ width: `${percent(item.value, item.max)}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-summary {
  padding: 18px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.header-row h3 {
  margin: 0 0 6px;
}

.header-row p {
  margin: 0;
  color: var(--text-muted);
}

.score-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(197, 63, 79, 0.08);
  color: var(--danger);
  font-weight: 700;
}

.score-pill.pass {
  background: rgba(31, 143, 93, 0.12);
  color: var(--success);
}

.score-pill.veto {
  background: rgba(197, 63, 79, 0.14);
  color: var(--danger);
}

.summary-alert {
  margin-bottom: 14px;
}

.score-list {
  display: grid;
  gap: 12px;
}

.score-row {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line-soft);
  background: rgba(248, 251, 255, 0.92);
}

.score-row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.score-bar-track {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(31, 115, 216, 0.12);
}

.score-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f73d8, #59a1ff);
}

@media (max-width: 1024px) {
  .header-row {
    flex-direction: column;
  }
}
</style>
