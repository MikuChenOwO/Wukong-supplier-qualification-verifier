<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSuppliersStore } from '../stores/suppliers'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const suppliersStore = useSuppliersStore()

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))

const menus = [
  { index: '/supplier/overview', label: '总览', icon: 'DataAnalysis' },
  { index: '/supplier/company', label: '企业信息', icon: 'OfficeBuilding' },
  { index: '/supplier/upload', label: '资质上传', icon: 'UploadFilled' },
  { index: '/supplier/records', label: '核验记录', icon: 'DocumentChecked' },
  { index: '/supplier/help', label: '帮助中心', icon: 'Reading' },
]

function handleSelect(index) {
  router.push(index)
}

function logout() {
  authStore.logout()
  router.push('/supplier/login')
}
</script>

<template>
  <div class="page-shell">
    <el-container class="layout-shell glass-panel">
      <el-aside width="272px" class="layout-aside">
        <div class="brand-block">
          <span class="brand-mark">悟空</span>
          <h2>供应商自助端</h2>
          <p>上传资质、预审核验、跟踪审核闭环</p>
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
          <div class="aside-title">当前企业</div>
          <strong>{{ supplier?.enterprise.enterpriseName || '未登录' }}</strong>
          <div class="status-text">{{ supplier?.enterprise.creditCode }}</div>
        </div>
      </el-aside>
      <el-container>
        <el-header class="layout-header">
          <div>
            <div class="header-kicker">Supplier Portal</div>
            <div class="header-title">{{ supplier?.enterprise.enterpriseName }}</div>
          </div>
          <div class="toolbar">
            <el-tag type="warning">Mock 纯前端</el-tag>
            <el-button plain @click="router.push('/supplier/upload')">发起核验</el-button>
            <el-button type="primary" @click="logout">退出登录</el-button>
          </div>
        </el-header>
        <el-main class="layout-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
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
  background: linear-gradient(180deg, rgba(255, 246, 233, 0.86), rgba(248, 237, 219, 0.6));
}

.brand-block {
  padding: 8px 8px 18px;
}

.brand-mark {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
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
