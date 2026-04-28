<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  previewUrl: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  title: { type: String, default: '在线预览' },
})

const zoom = ref(1)
const rotation = ref(0)
const boxRef = ref(null)

const isPdf = computed(() => props.mimeType.includes('pdf') || props.previewUrl.startsWith('data:application/pdf'))
const fileTypeLabel = computed(() => (isPdf.value ? 'PDF 预览' : props.previewUrl ? '图片预览' : '暂无预览'))
const contentStyle = computed(() => ({
  transform: `scale(${zoom.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center center',
}))

function changeZoom(delta) {
  zoom.value = Math.min(2, Math.max(0.6, Number((zoom.value + delta).toFixed(2))))
}

function rotate() {
  rotation.value += 90
}

function resetView() {
  zoom.value = 1
  rotation.value = 0
}

async function fullScreen() {
  if (boxRef.value?.requestFullscreen) {
    await boxRef.value.requestFullscreen()
  }
}
</script>

<template>
  <div ref="boxRef" class="preview-panel section-card">
    <div class="preview-toolbar">
      <div>
        <h3>{{ title }}</h3>
        <span class="status-text">支持 PDF 与图片在线查看，可缩放、旋转和全屏查看。</span>
      </div>
      <div class="toolbar">
        <el-tag type="info">{{ fileTypeLabel }}</el-tag>
        <span class="zoom-text">缩放 {{ Math.round(zoom * 100) }}%</span>
        <el-button plain @click="changeZoom(-0.1)">缩小</el-button>
        <el-button plain @click="changeZoom(0.1)">放大</el-button>
        <el-button plain @click="rotate">旋转</el-button>
        <el-button plain @click="resetView">重置</el-button>
        <el-button type="primary" @click="fullScreen">全屏</el-button>
      </div>
    </div>
    <div class="preview-stage">
      <iframe
        v-if="isPdf"
        class="pdf-frame"
        :style="contentStyle"
        :src="previewUrl"
        title="pdf-preview"
      />
      <img
        v-else-if="previewUrl"
        class="image-frame"
        :style="contentStyle"
        :src="previewUrl"
        :alt="title"
      />
      <div v-else class="rich-empty">
        当前文件暂无预览内容，Mock 模式下会保留文件元数据、识别结果和审核结论。
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  padding: 18px;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.preview-toolbar h3 {
  margin: 0 0 8px;
}

.zoom-text {
  color: var(--text-muted);
  font-size: 13px;
}

.preview-stage {
  min-height: 420px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(222, 237, 255, 0.72), rgba(248, 251, 255, 0.95));
  overflow: auto;
}

.pdf-frame,
.image-frame {
  width: 100%;
  max-width: 760px;
  height: 460px;
  border: none;
  border-radius: 14px;
  background: white;
  box-shadow: 0 10px 28px rgba(24, 64, 116, 0.12);
}

.image-frame {
  object-fit: contain;
}

@media (max-width: 1024px) {
  .preview-toolbar {
    flex-direction: column;
  }

  .pdf-frame,
  .image-frame {
    height: 380px;
  }
}
</style>
