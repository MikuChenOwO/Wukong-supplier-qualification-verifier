<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReviewsStore } from '../stores/reviews'
import AppFooter from '../components/AppFooter.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()

const pendingCount = computed(() => reviewsStore.pendingRecords.length)
const appealCount = computed(() => reviewsStore.activeAppealCount)
const rereviewCount = computed(() => reviewsStore.activeRereviewCount)

const menus = [
  { index: '/admin/reviews', label: '管理员审核', icon: 'Tickets' },
  { index: '/admin/appeals', label: '申诉复核台', icon: 'ChatDotSquare' },
  { index: '/admin/rereviews', label: '复审与重审', icon: 'DocumentChecked' },
  { index: '/admin/risk-radar', label: '动态风控', icon: 'Monitor' },
  { index: '/admin/suppliers', label: '供应商管理', icon: 'UserFilled' },
  { index: '/admin/standards', label: '标准管理', icon: 'Files' },
  { index: '/admin/permissions', label: '权限与接口', icon: 'Setting' },
  { index: '/admin/logs', label: '审核日志', icon: 'Histogram' },
]

function handleSelect(index) {
  router.push(index)
}

function logout() {
  authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="page-shell">
    <el-container class="layout-shell glass-panel">
      <el-aside width="284px" class="layout-aside">
        <div class="brand-block">
          <span class="brand-mark admin">悟空审核台</span>
          <h2>管理员审核端</h2>
          <p>统一处理审核、申诉、复审、风控、供应商档案和系统配置。</p>
        </div>
        <el-menu
          :default-active="route.path"
          class="menu-panel"
          background-color="transparent"
          @select="handleSelect"
        >
          <el-menu-item v-for="menu in menus" :key="menu.index" :index="menu.index">
            <el-icon><component :is="menu.icon" /></el-icon>
            <span>{{ menu.label }}</span>
          </el-menu-item>
        </el-menu>
        <div class="aside-footer section-card">
          <div class="aside-title">待办概况</div>
          <strong>{{ pendingCount }} 份待审核文件</strong>
          <div class="status-text">{{ appealCount }} 条申诉待处理</div>
          <div class="status-text">{{ rereviewCount }} 条复审任务待跟进</div>
          <div class="status-text">审核动作仅更新结论与意见，不修改供应商原始资料。</div>
        </div>
      </el-aside>
      <el-container>
        <el-header class="layout-header">
          <div>
            <div class="header-kicker">Admin Workbench</div>
            <div class="header-title">{{ authStore.displayName }}</div>
          </div>
          <div class="toolbar">
            <el-badge :value="pendingCount" :max="99">
              <el-button plain @click="router.push('/admin/reviews')">待审核</el-button>
            </el-badge>
            <el-badge :value="appealCount" :max="99">
              <el-button plain @click="router.push('/admin/appeals')">申诉复核</el-button>
            </el-badge>
            <el-badge :value="rereviewCount" :max="99">
              <el-button plain @click="router.push('/admin/rereviews')">复审重审</el-button>
            </el-badge>
            <el-button type="primary" @click="logout">退出登录</el-button>
          </div>
        </el-header>
        <el-main class="layout-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
    <AppFooter />
  </div>
</template>

<style scoped>
.layout-shell {
  min-height: calc(100vh - 48px);
  overflow: hidden;
}

.layout-aside {
  padding: 22px 18px;
  border-right: 1px solid var(--line-soft);
  background: linear-gradient(180deg, rgba(246, 250, 255, 0.94), rgba(221, 236, 255, 0.68));
}

.brand-mark {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #0b3f8a, #1f73d8);
}

.brand-block h2 {
  margin: 14px 0 8px;
  font-family: var(--font-accent);
}

.brand-block p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.menu-panel {
  border-right: none;
}

.aside-footer {
  margin-top: 20px;
  padding: 16px;
}

.aside-title,
.header-kicker {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.layout-header {
  height: auto;
  padding: 20px 24px 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.header-title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
}

.layout-main {
  padding: 24px;
}

@media (max-width: 1024px) {
  .layout-shell {
    display: block;
  }

  .layout-aside {
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid var(--line-soft);
  }

  .layout-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .layout-main {
    padding: 16px;
  }
}
</style>
