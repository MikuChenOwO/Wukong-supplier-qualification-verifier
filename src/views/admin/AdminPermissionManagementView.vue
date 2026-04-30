<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useAdminSettingsStore } from '../../stores/adminSettings'
import StatCard from '../../components/StatCard.vue'
import { formatDateTime } from '../../utils/format'

const authStore = useAuthStore()
const adminSettingsStore = useAdminSettingsStore()

const activeTab = ref('accounts')
const testingMap = ref({})

const canManageSystem = computed(() => authStore.adminRole === 'system-admin')
const adminAccounts = computed(() => adminSettingsStore.adminAccounts)
const reviewerAccounts = computed(() => adminSettingsStore.reviewerAccounts)
const systemAdminAccounts = computed(() => adminSettingsStore.systemAdminAccounts)
const permissionSections = computed(() => adminSettingsStore.permissionSections)
const interfaceRows = computed(() => adminSettingsStore.externalInterfaces)
const accountCount = computed(() => adminAccounts.value.length)
const activeAccountCount = computed(() => adminAccounts.value.filter((item) => item.status === 'active').length)
const enabledInterfaceCount = computed(() => adminSettingsStore.enabledInterfaceCount)
const permissionItemCount = computed(() => adminSettingsStore.permissionItemCount)

function yesNoMeta(flag) {
  return flag
    ? { label: '可用', type: 'success' }
    : { label: '不可用', type: 'info' }
}

function accountRoleMeta(role) {
  return {
    reviewer: { label: '采购 / 审核员', type: 'warning' },
    'system-admin': { label: '系统管理员', type: 'danger' },
  }[role] || { label: role || '未知', type: 'info' }
}

function connectionMeta(status) {
  return {
    connected: { label: '已连通', type: 'success' },
    warning: { label: '波动', type: 'warning' },
    pending: { label: '待接入', type: 'info' },
    offline: { label: '未连通', type: 'danger' },
  }[status] || { label: '未知', type: 'info' }
}

function handleResetAccountPassword(account) {
  ElMessage.success(`已为账号 ${account.account} 生成新的 Mock 重置工单。`)
}

function handleTestInterface(row) {
  testingMap.value = { ...testingMap.value, [row.id]: true }
  setTimeout(() => {
    try {
      const result = adminSettingsStore.testInterfaceConnection(row.id)
      ElMessage.success(`${result.name} 连通性检测完成：${result.connectionMeta.label}`)
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      testingMap.value = { ...testingMap.value, [row.id]: false }
    }
  }, 400)
}

function handleSaveInterface(row) {
  try {
    adminSettingsStore.updateInterfaceConfig(row.id, {
      enabled: row.enabled,
      environment: row.environment,
      timeoutSeconds: row.timeoutSeconds,
      autoRetry: row.autoRetry,
      ownerTeam: row.ownerTeam,
      remark: row.remark,
    })
    ElMessage.success(`已保存 ${row.name} 的接口参数。`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>权限与接口管理</h1>
        <p>集中维护后台账号和外部接口参数。</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="管理员账号" :value="accountCount" hint="当前纳入系统的管理员账号总数" />
      <StatCard label="启用账号" :value="activeAccountCount" hint="当前可以正常登录并执行后台操作的账号" tone="success" />
      <StatCard label="外部接口" :value="enabledInterfaceCount" hint="当前处于启用状态的接口配置数量" tone="warning" />
      <StatCard label="权限项" :value="permissionItemCount" hint="从权限表中抽取的权限功能条目总数" />
    </div>

    <el-alert
      v-if="!canManageSystem"
      type="warning"
      :closable="false"
      title="当前登录角色为采购 / 审核员，本页可查看，但系统级配置建议使用“系统管理员”账号维护。"
    />

    <div class="section-card permission-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="管理员账号" name="accounts">
          <div class="content-grid account-grid">
            <div class="section-card inner-card">
              <div class="panel-title">
                <div>
                  <h3>角色分布</h3>
                  <p>当前系统准备了“采购 / 审核员”和“系统管理员”两类后台账号。</p>
                </div>
              </div>
              <div class="capsule-list">
                <el-tag type="warning">采购 / 审核员 {{ reviewerAccounts.length }}</el-tag>
                <el-tag type="danger">系统管理员 {{ systemAdminAccounts.length }}</el-tag>
              </div>
            </div>

            <div class="section-card inner-card">
              <div class="panel-title">
                <div>
                  <h3>登录测试账号</h3>
                  <p>管理员登录页现在已经支持以下两组 Mock 账号。</p>
                </div>
              </div>
              <div class="login-note-list">
                <div v-for="item in adminAccounts" :key="item.id" class="login-note-item">
                  <strong>{{ item.account }} / {{ item.password }}</strong>
                  <span>{{ item.roleLabel }} · {{ item.name }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section-card inner-card">
            <div class="panel-title">
              <div>
                <h3>管理员账号列表</h3>
                <p>用于查看当前后台账号分工、数据范围和最近登录情况。</p>
              </div>
            </div>
            <el-table :data="adminAccounts" class="app-table" stripe>
              <el-table-column prop="name" label="姓名" min-width="180" />
              <el-table-column prop="account" label="登录账号" min-width="140" />
              <el-table-column label="角色" min-width="140">
                <template #default="{ row }">
                  <el-tag :type="accountRoleMeta(row.role).type">{{ accountRoleMeta(row.role).label }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="手机号" min-width="140" />
              <el-table-column prop="email" label="邮箱" min-width="220" />
              <el-table-column prop="dataScope" label="数据范围" min-width="160" />
              <el-table-column label="最近登录" min-width="180">
                <template #default="{ row }">{{ formatDateTime(row.lastLoginAt) }}</template>
              </el-table-column>
              <el-table-column label="状态" min-width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="120" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" @click="handleResetAccountPassword(row)">重置密码</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="权限矩阵" name="matrix">
          <div class="section-card inner-card matrix-source-card">
            <strong>权限来源</strong>
            <p>已读取项目根目录中的《权限管理.xlsx》，并按“供应商 / 采购审核员 / 系统管理员”三类角色整理成页面展示。</p>
          </div>

          <div class="permission-section-list">
            <div v-for="section in permissionSections" :key="section.id" class="section-card inner-card">
              <div class="panel-title">
                <div>
                  <h3>{{ section.title }}</h3>
                  <p>展示该模块下不同角色是否具备查看或操作权限。</p>
                </div>
              </div>
              <el-table :data="section.items" class="app-table" stripe>
                <el-table-column prop="name" label="功能项" min-width="260" />
                <el-table-column label="供应商" min-width="120">
                  <template #default="{ row }">
                    <el-tag :type="yesNoMeta(row.supplier).type">{{ yesNoMeta(row.supplier).label }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="采购 / 审核员" min-width="140">
                  <template #default="{ row }">
                    <el-tag :type="yesNoMeta(row.reviewer).type">{{ yesNoMeta(row.reviewer).label }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="系统管理员" min-width="140">
                  <template #default="{ row }">
                    <el-tag :type="yesNoMeta(row.systemAdmin).type">{{ yesNoMeta(row.systemAdmin).label }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="外部接口配置" name="interfaces">
          <div class="section-card inner-card matrix-source-card">
            <strong>当前补齐情况</strong>
            <p>你刚才问的“管理员用户外部接口配置”之前确实还没有，这次已经补成独立配置页，后续可以继续接真实接口。</p>
          </div>

          <div class="interface-grid">
            <div v-for="row in interfaceRows" :key="row.id" class="section-card interface-card">
              <div class="panel-title">
                <div>
                  <h3>{{ row.name }}</h3>
                  <p>{{ row.provider }}</p>
                </div>
                <el-tag :type="connectionMeta(row.status).type">{{ connectionMeta(row.status).label }}</el-tag>
              </div>

              <div class="metric-row">
                <span>接口编码</span>
                <strong>{{ row.code }}</strong>
              </div>
              <div class="metric-row">
                <span>接口地址</span>
                <strong class="mono-text">{{ row.baseUrl }}</strong>
              </div>
              <div class="metric-row">
                <span>鉴权方式</span>
                <strong>{{ row.authType }}</strong>
              </div>

              <div class="form-grid interface-form-grid">
                <div>
                  <span class="field-label">环境</span>
                  <el-input v-model="row.environment" :disabled="!canManageSystem" />
                </div>
                <div>
                  <span class="field-label">超时（秒）</span>
                  <el-input-number v-model="row.timeoutSeconds" :min="1" :max="60" :disabled="!canManageSystem" />
                </div>
                <div>
                  <span class="field-label">责任团队</span>
                  <el-input v-model="row.ownerTeam" :disabled="!canManageSystem" />
                </div>
                <div class="switch-line">
                  <el-switch v-model="row.enabled" :disabled="!canManageSystem" />
                  <span>启用接口</span>
                </div>
                <div class="switch-line">
                  <el-switch v-model="row.autoRetry" :disabled="!canManageSystem" />
                  <span>失败自动重试</span>
                </div>
              </div>

              <div class="metric-row">
                <span>最近检测</span>
                <strong>{{ formatDateTime(row.lastCheckedAt) }}</strong>
              </div>

              <el-input
                v-model="row.remark"
                type="textarea"
                :rows="3"
                :disabled="!canManageSystem"
                placeholder="补充接口用途、失败说明或切换计划"
              />

              <div class="toolbar interface-actions">
                <el-button plain :loading="testingMap[row.id]" @click="handleTestInterface(row)">测试连通性</el-button>
                <el-button type="primary" :disabled="!canManageSystem" @click="handleSaveInterface(row)">保存参数</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.permission-card,
.inner-card,
.interface-card {
  padding: 20px;
}

.account-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0 0 6px;
}

.panel-title p,
.matrix-source-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.matrix-source-card {
  margin-bottom: 16px;
}

.login-note-list,
.permission-section-list,
.interface-grid {
  display: grid;
  gap: 12px;
}

.login-note-item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line-soft);
  background: rgba(248, 251, 255, 0.9);
}

.login-note-item span,
.field-label {
  color: var(--text-muted);
  font-size: 12px;
}

.interface-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.interface-form-grid {
  margin: 16px 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.interface-actions {
  margin-top: 16px;
}

.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}

@media (max-width: 1180px) {
  .account-grid,
  .interface-grid,
  .interface-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
