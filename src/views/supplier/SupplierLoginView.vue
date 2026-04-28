<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useStandardsStore } from '../../stores/standards'
import AppFooter from '../../components/AppFooter.vue'

const router = useRouter()
const authStore = useAuthStore()
const standardsStore = useStandardsStore()

const MOCK_CODE = '888888'
const activeTab = ref('login')
const loginLoading = ref(false)
const registerLoading = ref(false)
const resetLoading = ref(false)
const resetDialogVisible = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)
const resetFormRef = ref(null)
const registerCodeSent = ref(false)
const resetCodeSent = ref(false)

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
  smsCode: '',
  registerAddress: '',
  productionAddress: '',
  supplierType: 'raw',
  productLevel: 'A',
  foundedAt: '',
  registeredCapital: '',
  businessScope: '',
})

const resetForm = reactive({
  phone: '',
  smsCode: '',
  password: '',
  confirmPassword: '',
})

const templateOptions = computed(() =>
  standardsStore.activeTemplates.filter((item) => item.supplierType === registerForm.supplierType),
)

const loginRules = {
  account: [{ required: true, message: '请输入供应商账号或手机号', trigger: 'blur' }],
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
  smsCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (value !== MOCK_CODE) callback(new Error('验证码错误，请输入 888888'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  registerAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
  supplierType: [{ required: true, message: '请选择供应商类型', trigger: 'change' }],
  productLevel: [{ required: true, message: '请选择产品等级', trigger: 'change' }],
}

const resetRules = {
  phone: [
    { required: true, message: '请输入登录手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' },
  ],
  smsCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (value !== MOCK_CODE) callback(new Error('验证码错误，请输入 888888'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度需在 6-20 位之间', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_, value, callback) => {
        if (!value) callback(new Error('请再次确认新密码'))
        else if (value !== resetForm.password) callback(new Error('两次密码输入不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

function sendRegisterCode() {
  if (!/^1\d{10}$/.test(registerForm.contactPhone)) {
    ElMessage.warning('请先填写正确的联系人手机号。')
    return
  }
  registerCodeSent.value = true
  registerForm.smsCode = MOCK_CODE
  ElMessage.success(`Mock 验证码已发送：${MOCK_CODE}`)
}

function sendResetCode() {
  if (!/^1\d{10}$/.test(resetForm.phone)) {
    ElMessage.warning('请先填写正确的登录手机号。')
    return
  }
  resetCodeSent.value = true
  resetForm.smsCode = MOCK_CODE
  ElMessage.success(`Mock 验证码已发送：${MOCK_CODE}`)
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

async function handleResetPassword() {
  await resetFormRef.value.validate()
  resetLoading.value = true

  setTimeout(() => {
    try {
      authStore.resetSupplierPasswordByPhone(resetForm.phone, resetForm.smsCode, resetForm.password)
      ElMessage.success('密码已重置，请使用新密码登录。')
      resetDialogVisible.value = false
      loginForm.account = resetForm.phone
      loginForm.password = ''
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      resetLoading.value = false
    }
  }, 500)
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-visual">
        <img src="/assets/wukong_verticle.png" alt="悟空供应商登录视觉" />
        <div class="visual-overlay">
          <span class="hero-kicker">WUKONG</span>
          <h1>企业资质自助服务</h1>
          <p>维护企业资料、管理资质文件、跟踪审核进度。</p>
        </div>
      </div>

      <div class="auth-form">
        <div class="form-heading">
          <h2>供应商登录</h2>
          <p>账号安全已加入验证码校验，注册与找回密码均使用手机号确认身份。</p>
        </div>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="账号登录" name="login">
            <el-alert
              type="info"
              :closable="false"
              title="测试账号：supplier01 / 123456；Mock 验证码：888888"
              style="margin-bottom: 16px"
            />
            <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-position="top">
              <el-form-item label="登录账号 / 手机号" prop="account">
                <el-input v-model="loginForm.account" placeholder="请输入供应商账号或手机号" />
              </el-form-item>
              <el-form-item label="登录密码" prop="password">
                <el-input v-model="loginForm.password" type="password" show-password placeholder="请输入密码" />
              </el-form-item>
              <div class="login-actions">
                <el-checkbox>记住登录状态</el-checkbox>
                <el-link type="primary" @click="resetDialogVisible = true">忘记密码？</el-link>
              </div>
              <el-button type="primary" :loading="loginLoading" style="width: 100%" @click="handleLogin">
                登录
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
                <el-form-item label="短信验证码" prop="smsCode">
                  <div class="code-row">
                    <el-input v-model="registerForm.smsCode" maxlength="6" placeholder="888888" />
                    <el-button plain @click="sendRegisterCode">
                      {{ registerCodeSent ? '重新发送' : '获取验证码' }}
                    </el-button>
                  </div>
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

    <el-dialog v-model="resetDialogVisible" title="手机号验证码重置密码" width="460px">
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-position="top">
        <el-form-item label="登录手机号" prop="phone">
          <el-input v-model="resetForm.phone" maxlength="11" placeholder="可使用示例供应商手机号 13800138000" />
        </el-form-item>
        <el-form-item label="短信验证码" prop="smsCode">
          <div class="code-row">
            <el-input v-model="resetForm.smsCode" maxlength="6" placeholder="888888" />
            <el-button plain @click="sendResetCode">{{ resetCodeSent ? '重新发送' : '获取验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="resetForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="resetDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="resetLoading" @click="handleResetPassword">确认修改</el-button>
        </div>
      </template>
    </el-dialog>
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
    radial-gradient(circle at 15% 15%, rgba(76, 151, 232, 0.2), transparent 30%),
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
    linear-gradient(90deg, rgba(7, 24, 52, 0.08), rgba(7, 24, 52, 0.46)),
    linear-gradient(0deg, rgba(7, 24, 52, 0.72), transparent 55%);
}

.visual-overlay {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 88px;
  z-index: 1;
  color: white;
}

.visual-overlay h1 {
  margin: 18px 0 12px;
  font-family: var(--font-accent);
  font-size: clamp(34px, 4vw, 54px);
  line-height: 1.15;
  text-shadow: 0 6px 20px rgba(0, 0, 0, 0.32);
}

.visual-overlay p {
  max-width: 520px;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: span 2;
}

.code-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.login-actions,
.extra-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-actions {
  margin: -6px 0 18px;
}

.extra-link {
  margin-top: 14px;
}

@media (max-width: 1024px) {
  .auth-panel,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    min-height: 320px;
  }

  .auth-form {
    margin: 0 18px 18px;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
