<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useStandardsStore } from '../../stores/standards'

const standardsStore = useStandardsStore()
const dialogVisible = ref(false)
const editingId = ref('')

const form = reactive({
  id: '',
  name: '',
  version: '',
  supplierType: 'raw',
  productLevel: 'A',
  threshold: 80,
  status: '启用',
  qualityWeight: 0.4,
  technicalWeight: 0.35,
  businessWeight: 0.25,
  bonusMax: 5,
  vetoRules: '',
})

const thresholdRows = computed(() => [
  { label: 'A 类产品', value: '>= 90 分' },
  { label: 'B 类产品', value: '>= 85 分' },
  { label: 'C 类产品', value: '>= 80 分' },
  { label: '技术合作类', value: '>= 85 分' },
  { label: '运输 / 其他类', value: '>= 80 分' },
])

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    id: '',
    name: '',
    version: '',
    supplierType: 'raw',
    productLevel: 'A',
    threshold: 80,
    status: '启用',
    qualityWeight: 0.4,
    technicalWeight: 0.35,
    businessWeight: 0.25,
    bonusMax: 5,
    vetoRules: '',
  })
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    id: row.id,
    name: row.name,
    version: row.version,
    supplierType: row.supplierType,
    productLevel: row.productLevel,
    threshold: row.threshold,
    status: row.status,
    qualityWeight: row.weights.quality,
    technicalWeight: row.weights.technical,
    businessWeight: row.weights.business,
    bonusMax: row.weights.bonusMax,
    vetoRules: row.vetoRules.join('；'),
  })
  dialogVisible.value = true
}

function saveTemplate() {
  standardsStore.upsertTemplate({
    id: editingId.value || '',
    name: form.name,
    version: form.version,
    supplierType: form.supplierType,
    productLevel: form.productLevel,
    threshold: form.threshold,
    status: form.status,
    weights: {
      quality: Number(form.qualityWeight),
      technical: Number(form.technicalWeight),
      business: Number(form.businessWeight),
      bonusMax: Number(form.bonusMax),
    },
    vetoRules: form.vetoRules ? form.vetoRules.split('；') : [],
  })
  dialogVisible.value = false
  ElMessage.success(editingId.value ? '模板已更新。' : '模板已新增。')
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>审核标准管理</h1>
        <p>支持维护审核模板、版本状态、准入门槛、权重和一票否决项，保留历史模板供不同供方类型适配。</p>
      </div>
      <el-button type="primary" @click="openCreate">新增模板</el-button>
    </div>

    <div class="content-grid two-col">
      <div class="section-card table-card">
        <div class="panel-title">
          <h3>模板列表</h3>
        </div>
        <el-table :data="standardsStore.templates" class="app-table" stripe>
          <el-table-column prop="name" label="模板名称" min-width="220" />
          <el-table-column prop="version" label="版本" min-width="100" />
          <el-table-column label="供应商类型" min-width="160">
            <template #default="{ row }">
              {{ standardsStore.supplierTypes.find((item) => item.value === row.supplierType)?.label }}
            </template>
          </el-table-column>
          <el-table-column prop="threshold" label="门槛分" min-width="100" />
          <el-table-column prop="status" label="状态" min-width="90" />
          <el-table-column label="操作" min-width="180" fixed="right">
            <template #default="{ row }">
              <div class="toolbar">
                <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button text type="primary" @click="standardsStore.toggleTemplateStatus(row.id)">
                  {{ row.status === '启用' ? '停用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="content-grid">
        <div class="section-card table-card">
          <div class="panel-title">
            <h3>通用准入分数</h3>
          </div>
          <div v-for="row in thresholdRows" :key="row.label" class="metric-row">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </div>
        </div>

        <div class="section-card table-card">
          <div class="panel-title">
            <h3>固定审核维度</h3>
          </div>
          <div class="metric-row">
            <span>质保部分</span>
            <strong>资质、体系、场地、人员、业绩、安环</strong>
          </div>
          <div class="metric-row">
            <span>技术部分</span>
            <strong>技术人员、设备、检验、生产过程</strong>
          </div>
          <div class="metric-row">
            <span>商务部分</span>
            <strong>财务、设备归属、运输、售后、满意度、进出口</strong>
          </div>
          <div class="metric-row">
            <span>加分项</span>
            <strong>绿色供应商认证，最高 5 分</strong>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑模板' : '新增模板'" width="720px">
      <div class="form-grid">
        <el-form-item label="模板名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="form.version" />
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
        <el-form-item label="门槛分">
          <el-input-number v-model="form.threshold" :min="60" :max="100" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="质量权重">
          <el-input-number v-model="form.qualityWeight" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item label="技术权重">
          <el-input-number v-model="form.technicalWeight" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item label="商务权重">
          <el-input-number v-model="form.businessWeight" :min="0" :max="1" :step="0.01" />
        </el-form-item>
        <el-form-item label="加分上限">
          <el-input-number v-model="form.bonusMax" :min="0" :max="10" />
        </el-form-item>
        <el-form-item label="一票否决项" class="span-2">
          <el-input v-model="form.vetoRules" type="textarea" :rows="3" placeholder="多个规则用中文分号分隔" />
        </el-form-item>
      </div>
      <template #footer>
        <div class="toolbar" style="justify-content: flex-end">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveTemplate">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.table-card {
  padding: 20px;
}

.panel-title h3 {
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: span 2;
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
