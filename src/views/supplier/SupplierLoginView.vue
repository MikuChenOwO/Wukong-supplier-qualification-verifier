<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useStandardsStore } from '../../stores/standards'

const router = useRouter()
const authStore = useAuthStore()
const standardsStore = useStandardsStore()

const activeTab = ref('login')
const loginLoading = ref(false)
const registerLoading = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({
  account: 'supplier01',
  password: '123456',
})

const registerForm = reactive({
  account: '',
  password: '',
  confirmPassword: '',
  enterpriseName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  registerAddress: '',
  productionAddress: '',
  supplierType: 'raw',
  productLevel: 'A',
  foundedAt: '',
  registeredCapital: '',
  businessScope: '',
})

const templateOptions = computed(() =>
  standardsStore.activeTemplates.filter((item) => item.supplierType === registerForm.supplierType),
)

const loginRules = {
  account: [{ required: true, message: '请输入供应商账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules = {
  account: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { min: 4, max: 20, message: '账号长度需在 4-20 位之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需在 6-20 位之间', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_, value, callback) => {
        if (!value) callback(new Error('请再次确认密码'))
        else if (value !== registerForm.password) callback(new Error('两次密码输入不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  creditCode: [
    { required: true, message: '请输入统一社会信用代码', trigger: 'blur' },
    { pattern: /^[0-9A-Z]{18}$/, message: '统一社会信用代码应为 18 位大写字母/数字', trigger: 'blur' },
  ],
  legalPerson: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '联系电话应为 11 位手机号', trigger: 'blur' },
  ],
  registerAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  supplierType: [{ required: true, message: '请选择供应商类型', trigger: 'change' }],
  productLevel: [{ required: true, message: '请选择产品等级', trigger: 'change' }],
}

async function handleLogin() {
  await loginFormRef.value.validate()
  loginLoading.value = true

  setTimeout(() => {
    try {
      authStore.loginSupplier(loginForm.account, loginForm.password)
      ElMessage.success('供应商登录成功，已进入悟空自助端。')
      router.push('/supplier/overview')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      loginLoading.value = false
    }
  }, 500)
}

async function handleRegister() {
  await registerFormRef.value.validate()
  registerLoading.value = true

  setTimeout(() => {
    try {
      authStore.registerAndLogin({
        ...registerForm,
        templateId: templateOptions.value[0]?.id || standardsStore.activeTemplates[0]?.id,
      })
      ElMessage.success('注册成功，已自动登录并进入供应商端。')
      router.push('/supplier/overview')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      registerLoading.value = false
    }
  }, 600)
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel glass-panel">
      <div class="auth-copy">
        <span class="hero-kicker">Supplier Portal</span>
        <h1>供应商资质自助接入</h1>
        <p>
          供应商可以在此完成注册、企业信息填报、资质上传、机器预审和审核结果追踪。所有数据保存在前端 Pinia，未接后端接口。
        </p>
        <div class="capsule-list">
          <span class="capsule-item">注册后自动匹配审核模板</span>
          <span class="capsule-item">支持工商 Mock 信息校验</span>
          <span class="capsule-item">支持资质审核记录追溯</span>
        </div>
      </div>
      <div class="auth-form section-card">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="账号登录" name="login">
            <el-alert
              type="info"
              :closable="false"
              title="测试账号：supplier01 / 123456"
              style="margin-bottom: 16px"
            />
            <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-position="top">
              <el-form-item label="登录账号" prop="account">
                <el-input v-model="loginForm.account" placeholder="请输入供应商账号" />
              </el-form-item>
              <el-form-item label="登录密码" prop="password">
                <el-input v-model="loginForm.password" type="password" show-password placeholder="请输入密码" />
              </el-form-item>
              <el-button type="primary" :loading="loginLoading" style="width: 100%" @click="handleLogin">
                登录进入
              </el-button>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="企业注册" name="register">
            <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-position="top">
              <div class="form-grid">
                <el-form-item label="登录账号" prop="account">
                  <el-input v-model="registerForm.account" placeholder="4-20 位账号" />
                </el-form-item>
                <el-form-item label="登录密码" prop="password">
                  <el-input v-model="registerForm.password" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input v-model="registerForm.confirmPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="企业名称" prop="enterpriseName">
                  <el-input v-model="registerForm.enterpriseName" />
                </el-form-item>
                <el-form-item label="统一社会信用代码" prop="creditCode">
                  <el-input v-model="registerForm.creditCode" maxlength="18" />
                </el-form-item>
                <el-form-item label="法人" prop="legalPerson">
                  <el-input v-model="registerForm.legalPerson" />
                </el-form-item>
                <el-form-item label="联系人" prop="contactName">
                  <el-input v-model="registerForm.contactName" />
                </el-form-item>
                <el-form-item label="联系电话" prop="contactPhone">
                  <el-input v-model="registerForm.contactPhone" maxlength="11" />
                </el-form-item>
                <el-form-item label="注册地址" prop="registerAddress" class="span-2">
                  <el-input v-model="registerForm.registerAddress" />
                </el-form-item>
                <el-form-item label="生产地址" class="span-2">
                  <el-input v-model="registerForm.productionAddress" />
                </el-form-item>
                <el-form-item label="供应商类型" prop="supplierType">
                  <el-select v-model="registerForm.supplierType">
                    <el-option
                      v-for="item in standardsStore.supplierTypes"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="产品等级" prop="productLevel">
                  <el-select v-model="registerForm.productLevel">
                    <el-option
                      v-for="item in standardsStore.productLevels"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <el-button type="primary" :loading="registerLoading" style="width: 100%" @click="handleRegister">
                注册并进入系统
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>
        <div class="extra-link">
          <el-link type="primary" @click="router.push('/')">返回门户首页</el-link>
          <el-link type="primary" @click="router.push('/admin/login')">切换管理员登录</el-link>
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
  width: min(1180px, 100%);
  padding: 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
  gap: 24px;
}

.auth-copy {
  padding: 18px 8px;
}

.auth-copy h1 {
  margin: 16px 0 14px;
  font-family: var(--font-accent);
  font-size: clamp(30px, 4vw, 46px);
}

.auth-copy p {
  margin: 0 0 22px;
  line-height: 1.9;
  color: var(--text-muted);
}

.auth-form {
  padding: 22px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: span 2;
}

.extra-link {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
}

@media (max-width: 1024px) {
  .auth-panel,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
