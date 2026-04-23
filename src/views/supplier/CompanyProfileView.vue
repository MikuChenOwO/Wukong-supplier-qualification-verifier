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
const verifyResult = ref(null)

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
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
  },
  { immediate: true },
)

watch(
  () => form.creditCode,
  (value) => {
    if (!value || value.length !== 18) return
    verifyResult.value = suppliersStore.verifyBusinessInfo(value, form)
  },
)

const rules = {
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
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true

  setTimeout(() => {
    suppliersStore.updateEnterprise(authStore.userId, { ...form })
    verifyResult.value = suppliersStore.verifyBusinessInfo(form.creditCode, form)
    ElMessage.success('企业信息已更新，历史变更已记录。')
    saving.value = false
  }, 500)
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>企业信息管理</h1>
        <p>支持供应商自主维护基础信息，保存时自动触发工商 Mock 数据校验，并记录变更历史。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存信息</el-button>
    </div>

    <div class="content-grid two-col">
      <div class="section-card form-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="form-grid">
            <el-form-item label="企业名称" prop="enterpriseName">
              <el-input v-model="form.enterpriseName" />
            </el-form-item>
            <el-form-item label="统一社会信用代码" prop="creditCode">
              <el-input v-model="form.creditCode" maxlength="18" />
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
          <p class="muted-note">{{ verifyResult?.message || '输入统一社会信用代码后自动核验。' }}</p>
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
            <h3>团队与同源信息</h3>
          </div>
          <div
            v-for="member in supplier?.teamMembers || []"
            :key="`${member.name}-${member.role}`"
            class="metric-row"
          >
            <span>{{ member.role }}</span>
            <strong>{{ member.name }}</strong>
          </div>
          <div class="soft-divider" />
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

  .span-2 {
    grid-column: span 1;
  }
}
</style>
