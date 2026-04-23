<script setup>
import { computed, reactive, ref } from 'vue'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import { formatDateTime, normalizeKeyword } from '../../utils/format'

const suppliersStore = useSuppliersStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const keyword = ref('')
const drawerVisible = ref(false)
const currentSupplierId = ref('')
const tab = ref('records')

const supplierRows = computed(() =>
  suppliersStore.suppliers
    .filter((item) =>
      !keyword.value ||
      normalizeKeyword(item.enterprise.enterpriseName).includes(normalizeKeyword(keyword.value)) ||
      normalizeKeyword(item.enterprise.creditCode).includes(normalizeKeyword(keyword.value)),
    )
    .map((item) => ({
      ...item,
      filesCount: reviewsStore.recordsBySupplier(item.id).length,
      approvedCount: reviewsStore.recordsBySupplier(item.id).filter((record) => record.status === 'approved').length,
    })),
)

const currentSupplier = computed(() => suppliersStore.currentSupplier(currentSupplierId.value))
const currentRecords = computed(() => reviewsStore.recordsBySupplier(currentSupplierId.value))

function openDrawer(row) {
  currentSupplierId.value = row.id
  drawerVisible.value = true
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>供应商管理列表</h1>
        <p>查看全部注册供应商、入驻时间、企业档案、上传文件与审核历史。</p>
      </div>
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input v-model="keyword" placeholder="搜索企业名称或统一社会信用代码" clearable style="max-width: 280px" />
      </div>
      <el-table :data="supplierRows" class="app-table" stripe>
        <el-table-column prop="enterprise.enterpriseName" label="供应商名称" min-width="220" />
        <el-table-column prop="enterprise.creditCode" label="统一社会信用代码" min-width="180" />
        <el-table-column label="供应商类型" min-width="180">
          <template #default="{ row }">
            {{ standardsStore.supplierTypes.find((item) => item.value === row.enterprise.supplierType)?.label }}
          </template>
        </el-table-column>
        <el-table-column prop="filesCount" label="上传文件数" min-width="110" />
        <el-table-column prop="approvedCount" label="已通过数" min-width="110" />
        <el-table-column label="入驻时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.registeredAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openDrawer(row)">查看档案</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawerVisible" :title="currentSupplier?.enterprise.enterpriseName" size="56%">
      <el-tabs v-model="tab">
        <el-tab-pane label="企业档案" name="profile">
          <div class="metric-row">
            <span>企业名称</span>
            <strong>{{ currentSupplier?.enterprise.enterpriseName }}</strong>
          </div>
          <div class="metric-row">
            <span>统一社会信用代码</span>
            <strong>{{ currentSupplier?.enterprise.creditCode }}</strong>
          </div>
          <div class="metric-row">
            <span>联系人</span>
            <strong>{{ currentSupplier?.enterprise.contactName }} / {{ currentSupplier?.enterprise.contactPhone }}</strong>
          </div>
          <div class="metric-row">
            <span>经营范围</span>
            <strong>{{ currentSupplier?.enterprise.businessScope }}</strong>
          </div>
        </el-tab-pane>
        <el-tab-pane label="上传记录" name="records">
          <el-table :data="currentRecords" class="app-table" stripe>
            <el-table-column prop="fileName" label="文件名" min-width="220" />
            <el-table-column prop="taskNo" label="任务号" min-width="140" />
            <el-table-column prop="precheckScore" label="预审分" min-width="90" />
            <el-table-column label="审核状态" min-width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">
                  {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '未通过' : '审核中' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="变更历史" name="history">
          <el-table :data="currentSupplier?.changeHistory || []" class="app-table" stripe>
            <el-table-column prop="field" label="字段" min-width="120" />
            <el-table-column prop="from" label="变更前" min-width="180" />
            <el-table-column prop="to" label="变更后" min-width="180" />
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.at) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<style scoped>
.table-card {
  padding: 20px;
}
</style>
