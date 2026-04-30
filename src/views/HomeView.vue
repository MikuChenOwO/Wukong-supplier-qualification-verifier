<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'

const router = useRouter()
const entrySection = ref(null)
const entriesVisible = ref(false)
let observer

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      entriesVisible.value = entry.isIntersecting
    },
    { threshold: 0.28 },
  )

  if (entrySection.value) {
    observer.observe(entrySection.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="home-shell">
    <section class="visual-stage">
      <img src="/assets/wukong.png" alt="供应商资质自动核验助手（悟空）" />
      <div class="scroll-cue">
        <span>向下进入系统</span>
        <i />
      </div>
    </section>

    <section ref="entrySection" class="entry-section" :class="{ 'is-visible': entriesVisible }">
      <div class="entry-heading">
        <span>选择入口</span>
        <h1>开始资质核验流程</h1>
        <p>供应商提交和维护资料，管理员完成审核与更新监控。</p>
      </div>

      <div class="entry-grid">
        <button class="entry-card supplier" type="button" @click="router.push('/supplier/login')">
          <div class="entry-index">01</div>
          <h2>企业入口</h2>
          <p>维护企业信息，上传与更新资质文件，查看审核状态和意见。</p>
          <strong>进入供应商端</strong>
        </button>

        <button class="entry-card admin" type="button" @click="router.push('/admin/login')">
          <div class="entry-index">02</div>
          <h2>审核工作台</h2>
          <p>处理待审核文件，复核预审结果，监控供应商文件更新。</p>
          <strong>进入管理员端</strong>
        </button>
      </div>
    </section>
    <AppFooter />
  </div>
</template>

<style scoped>
.home-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 10%, rgba(76, 151, 232, 0.18), transparent 26%),
    linear-gradient(180deg, #eaf4ff 0%, #f7fbff 46%, #dceafd 100%);
}

.visual-stage {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 0;
  overflow: hidden;
}

.visual-stage img {
  width: 100%;
  height: 100vh;
  display: block;
  object-fit: cover;
  object-position: center;
}

.scroll-cue {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  display: grid;
  justify-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
}

.scroll-cue i {
  width: 1px;
  height: 38px;
  display: block;
  background: linear-gradient(to bottom, rgba(31, 76, 128, 0.08), rgba(31, 76, 128, 0.6));
  animation: cue 1.6s ease-in-out infinite;
}

.entry-section {
  min-height: 100vh;
  display: grid;
  align-content: center;
  gap: 32px;
  padding: clamp(36px, 7vw, 86px);
}

.entry-heading {
  text-align: center;
  opacity: 0;
  transform: translateY(34px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}

.entry-heading span {
  color: var(--brand);
  font-weight: 800;
  letter-spacing: 2px;
}

.entry-heading h1 {
  margin: 12px 0;
  font-family: var(--font-accent);
  font-size: clamp(34px, 5vw, 58px);
}

.entry-heading p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}

.entry-grid {
  width: min(960px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.entry-card {
  min-height: 300px;
  padding: 32px;
  border: 1px solid rgba(31, 76, 128, 0.14);
  border-radius: 32px;
  text-align: left;
  color: var(--text-main);
  background: rgba(248, 251, 255, 0.82);
  box-shadow: 0 20px 56px rgba(24, 64, 116, 0.12);
  cursor: pointer;
  opacity: 0;
  transform: translateY(58px) scale(0.98);
  backdrop-filter: blur(18px);
  transition:
    opacity 0.58s ease,
    transform 0.58s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s ease,
    background 0.22s ease;
}

.entry-card:hover {
  transform: translateY(-6px) scale(1);
  background: rgba(248, 251, 255, 0.96);
  box-shadow: 0 28px 68px rgba(24, 64, 116, 0.2);
}

.entry-card.admin {
  color: #f5f9ff;
  background: linear-gradient(145deg, rgba(13, 45, 88, 0.94), rgba(31, 115, 216, 0.84));
}

.entry-card.admin:hover {
  background: linear-gradient(145deg, rgba(12, 55, 114, 0.96), rgba(38, 132, 240, 0.9));
}

.entry-index {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  font-weight: 800;
}

.entry-card h2 {
  margin: 28px 0 12px;
  font-family: var(--font-accent);
  font-size: 36px;
}

.entry-card p {
  min-height: 72px;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.85;
}

.entry-card.admin p {
  color: rgba(236, 246, 255, 0.84);
}

.entry-card strong {
  display: inline-block;
  margin-top: 30px;
  color: var(--brand-deep);
}

.entry-card.admin strong {
  color: #ecf6ff;
}

.entry-section.is-visible .entry-heading,
.entry-section.is-visible .entry-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.entry-section.is-visible .entry-card.admin {
  transition-delay: 0.12s;
}

@keyframes cue {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  50% {
    transform: translateY(8px);
    opacity: 1;
  }
}

@media (max-width: 820px) {
  .entry-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .entry-section {
    padding: 36px 16px;
  }
}
</style>
