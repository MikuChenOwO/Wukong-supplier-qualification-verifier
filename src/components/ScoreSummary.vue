<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Object, required: true },
  threshold: { type: Number, default: 80 },
})

const passState = computed(() => props.score.total >= props.threshold)
</script>

<template>
  <div class="score-summary section-card">
    <div class="header-row">
      <div>
        <h3>预审评分</h3>
        <p>按质量、技术、商务与加分项汇总生成建议分。</p>
      </div>
      <div class="score-pill" :class="{ pass: passState }">
        {{ score.total }} 分 / 门槛 {{ threshold }} 分
      </div>
    </div>
    <div class="metric-row">
      <span>质量部分</span>
      <strong>{{ score.quality }}</strong>
    </div>
    <div class="metric-row">
      <span>技术部分</span>
      <strong>{{ score.technical }}</strong>
    </div>
    <div class="metric-row">
      <span>商务部分</span>
      <strong>{{ score.business }}</strong>
    </div>
    <div class="metric-row">
      <span>绿色供应商加分</span>
      <strong>+{{ score.bonus }}</strong>
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
  background: rgba(195, 63, 34, 0.08);
  color: var(--danger);
  font-weight: 700;
}

.score-pill.pass {
  background: rgba(31, 143, 93, 0.12);
  color: var(--success);
}
</style>
