<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import MachineBadge from '../../components/MachineBadge.vue'
import StatusTag from '../../components/StatusTag.vue'
import { formatDateTime, normalizeKeyword } from '../../utils/format'

const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()

const filters = reactive({
  keyword: '',
  status: '',
  category: '',
})

const filteredRecords = computed(() =>
  reviewsStore.recordsBySupplier(authStore.userId).filter((item) => {
    const keywordMatched =
      !filters.keyword ||
      normalizeKeyword(item.fileName).includes(normalizeKeyword(filters.keyword)) ||
      normalizeKeyword(item.taskNo).includes(normalizeKeyword(filters.keyword))
    const statusMatched = !filters.status || item.status === filters.status
    const categoryMatched = !filters.category || item.category === filters.category
    return keywordMatched && statusMatched && categoryMatched
  }),
)

function openDetail(row) {
  router.push(`/supplier/records/${row.id}`)
}

function reupload(row) {
  router.push(`/supplier/upload?reupload=${row.id}&category=${row.category}`)
}

function rereviewStatusMeta(row) {
  const task = reviewsStore.latestRereviewByRecord(row.id)
  if (!task) {
    return { label: '--', type: 'info' }
  }

  return {
    pending: { label: '待处理', type: 'warning' },
    in_progress: { label: '复审中', type: 'primary' },
    approved: { label: '已完成', type: 'success' },
    rejected: { label: '未通过', type: 'danger' },
    closed: { label: '已关闭', type: 'info' },
  }[task.status] || { label: task.status, type: 'info' }
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>我的核验记录</h1>
        <p>查看每份资质文件的预审结果、人工审核状态、申诉入口以及复审进度。</p>
      </div>
    </div>

    <div class="section-card table-card">
      <div class="toolbar" style="margin-bottom: 16px">
        <el-input v-model="filters.keyword" placeholder="搜索文件名或任务号" clearable style="max-width: 260px" />
        <el-select v-model="filters.status" placeholder="审核状态" clearable style="width: 160px">
          <el-option label="审核中" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="有条件通过" value="conditional" />
          <el-option label="未通过" value="rejected" />
        </el-select>
        <el-select v-model="filters.category" placeholder="文件类型" clearable style="width: 180px">
          <el-option
            v-for="item in standardsStore.documentTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <el-table :data="filteredRecords" class="app-table" stripe>
        <el-table-column prop="fileName" label="文件名" min-width="220" />
        <el-table-column label="文件类型" min-width="160">
          <template #default="{ row }">
            {{ standardsStore.documentTypes.find((item) => item.value === row.category)?.label }}
          </template>
        </el-table-column>
        <el-table-column label="上传时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
        </el-table-column>
        <el-table-column label="机器预审" min-width="140">
          <template #default="{ row }">
            <MachineBadge :status="row.machineStatus" :score="row.precheckScore" />
          </template>
        </el-table-column>
        <el-table-column label="审核状态" min-width="120">
          <template #default="{ row }">
            <StatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="复审状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="rereviewStatusMeta(row).type">{{ rereviewStatusMeta(row).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220" fixed="right">
          <template #default="{ row }">
            <div class="toolbar">
              <el-button text type="primary" @click="openDetail(row)">查看详情</el-button>
              <el-button text type="primary" @click="openDetail(row)">在线预览</el-button>
              <el-button
                v-if="row.appealable"
                text
                type="warning"
                @click="$router.push(`/supplier/appeals?recordId=${row.id}`)"
              >
                发起申诉
              </el-button>
              <el-button v-if="row.status === 'rejected'" text type="danger" @click="reupload(row)">重新上传</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div
        v-for="row in filteredRecords.filter((item) => item.status === 'rejected' || item.status === 'conditional')"
        :key="`${row.id}-reason`"
        class="reject-note"
      >
        {{ row.fileName }}：{{ row.adminOpinion }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-card {
  padding: 20px;
}

.reject-note {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(197, 63, 79, 0.08);
  color: var(--danger);
}
</style>
