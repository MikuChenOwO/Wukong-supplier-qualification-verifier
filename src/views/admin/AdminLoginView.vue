<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import AppFooter from '../../components/AppFooter.vue'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const form = reactive({
  account: 'admin',
  password: 'admin123',
})

const rules = {
  account: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true

  setTimeout(() => {
    try {
      authStore.loginAdmin(form.account, form.password)
      ElMessage.success('管理员登录成功。')
      router.push('/admin/reviews')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      loading.value = false
    }
  }, 500)
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-visual">
        <img src="/assets/wukong_verticle.png" alt="管理员登录视觉图" />
        <div class="visual-overlay">
          <span>WUKONG</span>
          <h1>资质审核管理服务</h1>
          <p>处理审核待办、监控文件更新、维护审核标准、权限与外部接口配置。</p>
        </div>
      </div>

      <div class="auth-form">
        <div class="form-heading">
          <h2>管理员登录</h2>
          <p>管理员只负责审核、风控、系统配置和意见维护，不修改供应商原始资料与文件。</p>
        </div>
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
          title="测试账号：admin / admin123（采购 / 审核员）；sysadmin / sysadmin123（系统管理员）"
        />
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="管理员账号" prop="account">
            <el-input v-model="form.account" placeholder="请输入管理员账号" />
          </el-form-item>
          <el-form-item label="登录密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入登录密码" />
          </el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">
            登录
          </el-button>
        </el-form>
        <div class="extra-link">
          <el-link type="primary" @click="router.push('/')">返回门户首页</el-link>
          <el-link type="primary" @click="router.push('/supplier/login')">切换供应商登录</el-link>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 16% 14%, rgba(76, 151, 232, 0.2), transparent 30%),
    linear-gradient(135deg, #e4f0ff 0%, #f5f9ff 52%, #d8e9ff 100%);
}

.auth-panel {
  width: min(1180px, 100%);
  min-height: 680px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
  gap: 22px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 34px;
  background: rgba(244, 248, 255, 0.44);
  box-shadow: 0 26px 70px rgba(24, 64, 116, 0.18);
  overflow: hidden;
  backdrop-filter: blur(18px);
}

.auth-visual {
  position: relative;
  min-height: 680px;
  overflow: hidden;
  background: #0b2447;
}

.auth-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.auth-visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(7, 24, 52, 0.08), rgba(7, 24, 52, 0.44)),
    linear-gradient(0deg, rgba(7, 24, 52, 0.74), transparent 58%);
}

.visual-overlay {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 88px;
  z-index: 1;
  color: white;
}

.visual-overlay span {
  display: inline-block;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  letter-spacing: 1px;
}

.visual-overlay h1 {
  margin: 18px 0 12px;
  font-family: var(--font-accent);
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.16;
  text-shadow: 0 6px 20px rgba(0, 0, 0, 0.32);
}

.visual-overlay p {
  max-width: 500px;
  margin: 0;
  color: rgba(255, 250, 240, 0.88);
  line-height: 1.8;
}

.auth-form {
  align-self: center;
  margin: 30px 28px 30px 0;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(248, 251, 255, 0.62), rgba(222, 237, 255, 0.32));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 20px 60px rgba(24, 64, 116, 0.16);
  backdrop-filter: blur(24px);
}

.form-heading h2 {
  margin: 0 0 8px;
  font-family: var(--font-accent);
  font-size: 28px;
}

.form-heading p {
  margin: 0 0 18px;
  color: var(--text-muted);
  line-height: 1.7;
}

.auth-form :deep(.el-input__wrapper),
.auth-form :deep(.el-select__wrapper),
.auth-form :deep(.el-textarea__inner) {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.36);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76), 0 10px 24px rgba(24, 64, 116, 0.08);
  backdrop-filter: blur(16px);
}

.extra-link {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
}

@media (max-width: 900px) {
  .auth-panel {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    min-height: 320px;
  }

  .auth-form {
    margin: 0 18px 18px;
  }
}
</style>
