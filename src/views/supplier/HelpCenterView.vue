<script setup>
import { useStandardsStore } from '../../stores/standards'

const standardsStore = useStandardsStore()
</script>

<template>
  <div class="content-grid">
    <div class="page-title">
      <div>
        <h1>帮助中心</h1>
        <p>汇总审核指南、FAQ、流程解读与合格/不合格案例，帮助供应商快速理解规则。</p>
      </div>
    </div>

    <div class="section-card help-card">
      <div class="panel-title">
        <h3>审核流程解读</h3>
      </div>
      <el-steps :active="4" finish-status="success">
        <el-step title="资料准备" description="企业信息、证照、团队信息、同源信息填报" />
        <el-step title="机器预审" description="有效期、字段比对、风险标记、自动评分" />
        <el-step title="人工审核" description="管理员复核结果、填写意见、锁定状态" />
        <el-step title="结果归档" description="同步供应商端、形成审核日志与复评提醒" />
      </el-steps>
    </div>

    <div class="content-grid three-col">
      <div v-for="item in standardsStore.knowledgeBase" :key="item.id" class="section-card faq-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-card,
.faq-card {
  padding: 20px;
}

.panel-title h3,
.faq-card h3 {
  margin: 0 0 12px;
}

.faq-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}
</style>
