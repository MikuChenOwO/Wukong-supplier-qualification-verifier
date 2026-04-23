<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'default' },
})
</script>

<template>
  <div class="stat-card section-card" :class="`tone-${tone}`">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div class="hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 18px 20px;
  min-height: 130px;
  position: relative;
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: auto -20px -25px auto;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(31, 115, 216, 0.08);
}

.label {
  color: var(--text-muted);
  font-size: 13px;
}

.value {
  margin-top: 14px;
  font-size: 34px;
  font-weight: 700;
  color: var(--text-main);
}

.hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 80%;
}

.tone-danger::after {
  background: rgba(197, 63, 79, 0.1);
}

.tone-success::after {
  background: rgba(31, 143, 93, 0.12);
}
</style>
