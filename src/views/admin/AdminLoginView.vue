<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

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
    <div class="auth-panel glass-panel admin">
      <div class="auth-copy">
        <span class="hero-kicker">Audit Workbench</span>
        <h1>管理员审核工作台</h1>
        <p>
          这里集中处理供应商待审核文件、人工评分、标准模板管理和审核日志导出。管理员只能审核与填写意见，不能篡改原始资料。
        </p>
      </div>
      <div class="auth-form section-card">
        <el-alert type="info" :closable="false" title="测试账号：admin / admin123" style="margin-bottom: 16px" />
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="管理员账号" prop="account">
            <el-input v-model="form.account" />
          </el-form-item>
          <el-form-item label="登录密码" prop="password">
            <el-input v-model="form.password" type="password" show-password />
          </el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">
            登录审核台
          </el-button>
        </el-form>
        <div class="extra-link">
          <el-link type="primary" @click="router.push('/')">返回门户首页</el-link>
          <el-link type="primary" @click="router.push('/supplier/login')">切换供应商登录</el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-panel {
  width: min(1080px, 100%);
  padding: 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  gap: 24px;
}

.auth-copy {
  padding: 18px 8px;
}

.auth-copy h1 {
  margin: 16px 0 14px;
  font-family: var(--font-accent);
  font-size: clamp(30px, 4vw, 44px);
}

.auth-copy p {
  margin: 0;
  line-height: 1.9;
  color: var(--text-muted);
}

.auth-form {
  padding: 22px;
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
}
</style>
