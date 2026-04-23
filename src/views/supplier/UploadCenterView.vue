<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useReviewsStore } from '../../stores/reviews'
import { useStandardsStore } from '../../stores/standards'
import { useSuppliersStore } from '../../stores/suppliers'
import { formatDateTime } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reviewsStore = useReviewsStore()
const standardsStore = useStandardsStore()
const suppliersStore = useSuppliersStore()

const uploading = ref(false)
const uploadRef = ref(null)
const fileList = ref([])

const supplier = computed(() => suppliersStore.currentSupplier(authStore.userId))
const currentTemplate = computed(() => standardsStore.findTemplateById(supplier.value?.enterprise.templateId))
const recentRecords = computed(() => reviewsStore.recordsBySupplier(authStore.userId).slice(0, 5))

const form = reactive({
  category: route.query.category || 'business-license',
})

function beforeUpload(rawFile) {
  const allowTypes = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowTypes.includes(rawFile.type)) {
    ElMessage.error('仅支持 PDF、PNG、JPG 文件。')
    return false
  }
  if (rawFile.size > 20 * 1024 * 1024) {
    ElMessage.error('单文件大小不能超过 20MB。')
    return false
  }
  return true
}

function handleChange(_, files) {
  fileList.value = files
}

function buildPreviewUrl(file) {
  if (file.raw) {
    return URL.createObjectURL(file.raw)
  }
  return ''
}

function handleRemove(_, files) {
  fileList.value = files
}

function resetSelection() {
  fileList.value = []
  uploadRef.value?.clearFiles()
}

function submitUpload() {
  uploading.value = true
  setTimeout(() => {
    try {
      const records = reviewsStore.uploadDocuments({
        supplierId: authStore.userId,
        category: form.category,
        reuploadOf: String(route.query.reupload || ''),
        files: fileList.value.map((file) => ({
          name: file.name,
          type: file.raw?.type || file.raw?.mime || '',
          size: file.size,
          previewUrl: buildPreviewUrl(file),
        })),
      })
      ElMessage.success(`已完成 ${records.length} 份文件上传，并进入机器预审核。`)
      resetSelection()
      router.replace('/supplier/upload')
    } catch (error) {
      ElMessage.error(error.message)
    } finally {
      uploading.value = false
    }
  }, 800)
}
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>资质上传中心</h1>
        <p>支持 PDF / PNG / JPG 文件，上传完成后自动执行字段识别、风险标记和预审评分，并推送到管理员待审核队列。</p>
      </div>
    </div>

    <div class="content-grid two-col">
      <div class="section-card upload-card">
        <div class="panel-title">
          <h3>发起上传</h3>
          <el-tag type="warning">单文件 ≤ 20MB</el-tag>
        </div>
        <el-alert
          v-if="route.query.reupload"
          type="warning"
          :closable="false"
          title="当前为未通过文件的重新上传，提交后状态会重置为“审核中”。"
          style="margin-bottom: 16px"
        />
        <el-form label-position="top">
          <el-form-item label="文件类型">
            <el-select v-model="form.category">
              <el-option
                v-for="item in standardsStore.documentTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="当前准入模板">
            <el-input :model-value="currentTemplate?.name" disabled />
          </el-form-item>
          <el-upload
            ref="uploadRef"
            drag
            multiple
            :auto-upload="false"
            :file-list="fileList"
            :before-upload="beforeUpload"
            :on-change="handleChange"
            :on-remove="handleRemove"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或 <em>点击选择文件</em></div>
            <template #tip>
              <div class="status-text">
                同一供应商不可重复上传同类型文件；未通过文件需要通过“重新上传”入口重提。
              </div>
            </template>
          </el-upload>
        </el-form>
        <div class="toolbar" style="margin-top: 18px">
          <el-button type="primary" :loading="uploading" @click="submitUpload">上传并触发预审核</el-button>
          <el-button plain @click="resetSelection">清空所选</el-button>
        </div>
      </div>

      <div class="content-grid">
        <div class="section-card upload-card">
          <div class="panel-title">
            <h3>模板规则提示</h3>
          </div>
          <div class="metric-row">
            <span>模板名称</span>
            <strong>{{ currentTemplate?.name }}</strong>
          </div>
          <div class="metric-row">
            <span>准入门槛</span>
            <strong>{{ currentTemplate?.threshold }} 分</strong>
          </div>
          <div class="metric-row">
            <span>一票否决</span>
            <strong>{{ currentTemplate?.vetoRules?.join('；') || '无' }}</strong>
          </div>
          <div class="metric-row">
            <span>加分项</span>
            <strong>绿色供应商认证，最高 {{ currentTemplate?.weights.bonusMax }} 分</strong>
          </div>
        </div>

        <div class="section-card upload-card">
          <div class="panel-title">
            <h3>最近上传</h3>
            <el-button text @click="$router.push('/supplier/records')">全部记录</el-button>
          </div>
          <div v-if="recentRecords.length">
            <div v-for="record in recentRecords" :key="record.id" class="metric-row">
              <span>{{ record.fileName }}</span>
              <strong>{{ formatDateTime(record.uploadedAt) }}</strong>
            </div>
          </div>
          <div v-else class="rich-empty">还没有上传记录，先提交第一份资质文件吧。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-card {
  padding: 20px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-title h3 {
  margin: 0;
}
</style>
