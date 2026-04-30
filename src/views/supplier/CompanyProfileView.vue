<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import { formatDateTime } from '../../utils/format'

const authStore = useAuthStore()
const suppliersStore = useSuppliersStore()
const standardsStore = useStandardsStore()

const formRef = ref(null)
const saving = ref(false)
const querying = ref(false)
const draftSaving = ref(false)
const verifyResult = ref(null)
const draftInfo = ref(null)

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const templateOptions = computed(() =>
  standardsStore.activeTemplates.filter((item) => item.supplierType === form.supplierType),
)
const draftSummary = computed(() => {
  if (!draftInfo.value?.savedAt) return '当前没有可恢复的草稿'
  const suffix = draftInfo.value.persisted ? '，已保存在当前浏览器本地' : ''
  return `最近暂存于 ${formatDateTime(draftInfo.value.savedAt)}${suffix}`
})

const form = reactive({
  enterpriseName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  registerAddress: '',
  productionAddress: '',
  foundedAt: '',
  registeredCapital: '',
  businessScope: '',
  supplierType: '',
  productLevel: '',
  templateId: '',
})

watch(
  supplier,
  (value) => {
    if (!value) return

    Object.assign(form, value.enterprise)
    verifyResult.value = suppliersStore.verifyBusinessInfo(value.enterprise.creditCode, value.enterprise)
    draftInfo.value = suppliersStore.getFormDraft(authStore.userId, 'company-profile') || null
  },
  { immediate: true },
)

watch(
  templateOptions,
  (options) => {
    if (!options.length) return
    if (!options.some((item) => item.id === form.templateId)) {
      form.templateId = options[0].id
    }
  },
  { immediate: true },
)

const rules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  creditCode: [
    { required: true, message: '请输入统一社会信用代码', trigger: 'blur' },
    { pattern: /^[0-9A-Z]{18}$/, message: '统一社会信用代码应为 18 位大写字母或数字', trigger: 'blur' },
  ],
  legalPerson: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '联系电话应为 11 位手机号', trigger: 'blur' },
  ],
  registerAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true

  setTimeout(() => {
    suppliersStore.updateEnterprise(authStore.userId, {
      ...form,
      templateId: templateOptions.value[0]?.id || form.templateId,
    })
    verifyResult.value = suppliersStore.verifyBusinessInfo(form.creditCode, form)
    suppliersStore.clearFormDraft(authStore.userId, 'company-profile')
    draftInfo.value = null
    ElMessage.success('企业信息已更新，并已记录变更历史。')
    saving.value = false
  }, 500)
}

function handleLookupCreditCode() {
  const creditCode = String(form.creditCode || '').trim().toUpperCase()
  if (!/^[0-9A-Z]{18}$/.test(creditCode)) {
    ElMessage.warning('请先输入 18 位统一社会信用代码后再查询。')
    return
  }

  querying.value = true
  setTimeout(() => {
    const result = suppliersStore.lookupEnterpriseByCreditCode(creditCode)
    if (!result.matched) {
      verifyResult.value = result
      ElMessage.warning(result.message)
      querying.value = false
      return
    }

    Object.assign(form, result.autofill, {
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      supplierType: form.supplierType,
      productLevel: form.productLevel,
      templateId: templateOptions.value[0]?.id || form.templateId,
    })
    verifyResult.value = suppliersStore.verifyBusinessInfo(creditCode, form)
    ElMessage.success('已按工商 Mock 数据完成企业信息回填。')
    querying.value = false
  }, 400)
}

function handleSaveDraft() {
  draftSaving.value = true

  setTimeout(() => {
    const draft = suppliersStore.saveFormDraft(authStore.userId, 'company-profile', {
      ...form,
      templateId: templateOptions.value[0]?.id || form.templateId,
    })
    draftInfo.value = draft
    ElMessage.success('企业信息草稿已暂存，可稍后继续填写。')
    draftSaving.value = false
  }, 250)
}

function handleRestoreDraft() {
  const draft = suppliersStore.getFormDraft(authStore.userId, 'company-profile')
  if (!draft) {
    ElMessage.info('当前没有可恢复的企业信息草稿。')
    return
  }

  Object.assign(form, draft.payload)
  draftInfo.value = draft
  verifyResult.value = suppliersStore.verifyBusinessInfo(form.creditCode, form)
  ElMessage.success('已恢复最近一次暂存的企业信息草稿。')
}

function handleClearDraft() {
  suppliersStore.clearFormDraft(authStore.userId, 'company-profile')
  draftInfo.value = null
  ElMessage.success('企业信息草稿已清除。')
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>企业信息管理</h1>
        <p>支持统一社会信用代码手动查询回填、草稿本地暂存与恢复，并在正式保存时记录企业信息变更历史。</p>
      </div>
      <div class="toolbar">
        <el-button plain :loading="draftSaving" @click="handleSaveDraft">暂存草稿</el-button>
        <el-button plain @click="handleRestoreDraft">恢复草稿</el-button>
        <el-button v-if="draftInfo" plain type="danger" @click="handleClearDraft">清除草稿</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存信息</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      title="当前草稿会自动保存在本地浏览器中；即使刷新页面或稍后回来，也可以继续恢复填写。"
    />

    <div class="content-grid two-col">
      <div class="section-card form-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="form-grid">
            <el-form-item label="企业名称" prop="enterpriseName">
              <el-input v-model="form.enterpriseName" />
            </el-form-item>
            <el-form-item label="统一社会信用代码" prop="creditCode">
              <div class="credit-code-row">
                <el-input v-model="form.creditCode" maxlength="18" />
                <el-button type="primary" plain :loading="querying" @click="handleLookupCreditCode">查询并回填</el-button>
              </div>
            </el-form-item>
            <el-form-item label="法人" prop="legalPerson">
              <el-input v-model="form.legalPerson" />
            </el-form-item>
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="form.contactName" />
            </el-form-item>
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" maxlength="11" />
            </el-form-item>
            <el-form-item label="成立时间">
              <el-date-picker v-model="form.foundedAt" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="注册地址" prop="registerAddress" class="span-2">
              <el-input v-model="form.registerAddress" />
            </el-form-item>
            <el-form-item label="生产地址" class="span-2">
              <el-input v-model="form.productionAddress" />
            </el-form-item>
            <el-form-item label="注册资本">
              <el-input v-model="form.registeredCapital" />
            </el-form-item>
            <el-form-item label="经营范围">
              <el-input v-model="form.businessScope" />
            </el-form-item>
            <el-form-item label="供应商类型">
              <el-select v-model="form.supplierType">
                <el-option
                  v-for="item in standardsStore.supplierTypes"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="产品等级">
              <el-select v-model="form.productLevel">
                <el-option
                  v-for="item in standardsStore.productLevels"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="推荐准入模板" class="span-2">
              <el-input :model-value="templateOptions[0]?.name || '请先选择供应商类型'" disabled />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <div class="content-grid">
        <div class="section-card side-card">
          <div class="panel-title">
            <h3>工商 Mock 校验</h3>
            <el-tag :type="verifyResult?.matched ? 'success' : 'warning'">
              {{ verifyResult?.matched ? '信息一致' : '待核对' }}
            </el-tag>
          </div>
          <p class="muted-note">
            {{ verifyResult?.message || '输入统一社会信用代码后，点击“查询并回填”获取工商 Mock 信息。' }}
          </p>
          <div v-if="verifyResult?.registry" class="metric-row">
            <span>登记主体</span>
            <strong>{{ verifyResult.registry.enterpriseName }}</strong>
          </div>
          <div v-if="verifyResult?.registry" class="metric-row">
            <span>登记法人</span>
            <strong>{{ verifyResult.registry.legalPerson }}</strong>
          </div>
          <div v-if="verifyResult?.registry" class="metric-row">
            <span>登记地址</span>
            <strong>{{ verifyResult.registry.registerAddress }}</strong>
          </div>
        </div>

        <div class="section-card side-card">
          <div class="panel-title">
            <h3>草稿与协同信息</h3>
          </div>
          <div class="metric-row">
            <span>草稿状态</span>
            <strong>{{ draftSummary }}</strong>
          </div>
          <div class="metric-row">
            <span>推荐模板</span>
            <strong>{{ templateOptions[0]?.name || '待选择供应商类型' }}</strong>
          </div>
          <div class="metric-row">
            <span>模板版本</span>
            <strong>{{ templateOptions[0]?.version || '--' }}</strong>
          </div>
          <div class="soft-divider" />
          <div
            v-for="member in supplier?.teamMembers || []"
            :key="`${member.name}-${member.role}`"
            class="metric-row"
          >
            <span>{{ member.role }}</span>
            <strong>{{ member.name }}</strong>
          </div>
          <div
            v-for="relation in supplier?.relatedParties || []"
            :key="`${relation.name}-${relation.relation}`"
            class="metric-row"
          >
            <span>{{ relation.relation }}</span>
            <strong>{{ relation.name }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="section-card side-card">
      <div class="panel-title">
        <h3>变更历史</h3>
      </div>
      <el-table :data="supplier?.changeHistory || []" class="app-table" stripe>
        <el-table-column prop="field" label="字段" min-width="120" />
        <el-table-column prop="from" label="变更前" min-width="180" />
        <el-table-column prop="to" label="变更后" min-width="180" />
        <el-table-column label="变更时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.at) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.form-card,
.side-card {
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.credit-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.span-2 {
  grid-column: span 2;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.panel-title h3 {
  margin: 0;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .credit-code-row {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
