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
        <span class="status-text">支持 PDF / 图片在线查看、放大、旋转与全屏</span>
      </div>
      <div class="toolbar">
        <el-button plain @click="changeZoom(-0.1)">缩小</el-button>
        <el-button plain @click="changeZoom(0.1)">放大</el-button>
        <el-button plain @click="rotate">旋转</el-button>
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
        当前文件暂无预览内容，Mock 模式下会保留文件元数据与审核结果。
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

.preview-stage {
  min-height: 480px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(246, 229, 205, 0.65), rgba(255, 248, 239, 0.95));
  overflow: auto;
}

.pdf-frame,
.image-frame {
  width: min(100%, 880px);
  height: 520px;
  border: none;
  border-radius: 14px;
  background: white;
  box-shadow: 0 10px 28px rgba(68, 45, 14, 0.12);
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
