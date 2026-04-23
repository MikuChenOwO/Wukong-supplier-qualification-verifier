<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="home-shell">
    <div class="home-panel glass-panel">
      <div class="hero-copy">
        <span class="hero-kicker">WUKONG</span>
        <h1>供应商资质自动核验助手</h1>
        <p>
          这是一个纯前端 Mock 审核系统，围绕供应商上传、机器预审、管理员复核、状态同步与标准评分规则构建完整业务闭环。
        </p>
        <div class="hero-points">
          <span>Vue3 + Vite</span>
          <span>Pinia 本地状态</span>
          <span>无真实后端请求</span>
          <span>双角色工作流</span>
        </div>
      </div>
      <div class="entry-grid">
        <div class="entry-card section-card">
          <h3>供应商入口</h3>
          <p>登录后维护企业信息、上传资质、查看核验记录与审核意见。</p>
          <el-button type="primary" @click="router.push('/supplier/login')">进入供应商端</el-button>
          <div class="demo-account">测试账号：`supplier01 / 123456`</div>
        </div>
        <div class="entry-card section-card">
          <h3>管理员入口</h3>
          <p>查看待审核队列、人工评分、标准管理、审核日志与导出。</p>
          <el-button type="primary" @click="router.push('/admin/login')">进入管理员端</el-button>
          <div class="demo-account">测试账号：`admin / admin123`</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.home-panel {
  width: min(1100px, 100%);
  padding: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
}

.hero-kicker {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
}

.hero-copy h1 {
  margin: 16px 0 14px;
  font-family: var(--font-accent);
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.2;
}

.hero-copy p {
  margin: 0;
  font-size: 16px;
  line-height: 1.9;
  color: var(--text-muted);
}

.hero-points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.hero-points span {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(195, 91, 29, 0.08);
  color: var(--brand-deep);
}

.entry-grid {
  display: grid;
  gap: 18px;
}

.entry-card {
  padding: 22px;
}

.entry-card h3 {
  margin: 0 0 8px;
}

.entry-card p {
  margin: 0 0 18px;
  color: var(--text-muted);
  line-height: 1.8;
}

.demo-account {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 960px) {
  .home-panel {
    grid-template-columns: 1fr;
    padding: 22px;
  }
}
</style>
