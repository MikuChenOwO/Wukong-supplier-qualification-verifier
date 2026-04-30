import { defineStore } from 'pinia'
import { MOCK_ADMINS } from '../constants/mockData'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const PERMISSION_SECTIONS = [
  {
    id: 'portal',
    title: '供应商协同门户',
    items: [
      { name: '自助注册与信息填报', supplier: true, reviewer: false, systemAdmin: false },
      { name: '材料清单查看与上传', supplier: true, reviewer: false, systemAdmin: false },
      { name: '草稿暂存与断点续传', supplier: true, reviewer: false, systemAdmin: false },
      { name: '状态查看（审核进度 / 预警）', supplier: true, reviewer: false, systemAdmin: false },
      { name: '补正材料提交', supplier: true, reviewer: false, systemAdmin: false },
      { name: '申诉提交', supplier: true, reviewer: false, systemAdmin: false },
    ],
  },
  {
    id: 'engine',
    title: '数字员工核验引擎',
    items: [
      { name: '完整性校验结果查看', supplier: true, reviewer: true, systemAdmin: false },
      { name: '真实性校验结果查看', supplier: false, reviewer: true, systemAdmin: false },
      { name: '符合性评分结果查看', supplier: false, reviewer: true, systemAdmin: false },
      { name: '同源筛查图谱查看', supplier: false, reviewer: true, systemAdmin: false },
      { name: '复核简报查看', supplier: false, reviewer: true, systemAdmin: false },
    ],
  },
  {
    id: 'review',
    title: '审核流程管理',
    items: [
      { name: '审核任务领取 / 处理', supplier: false, reviewer: true, systemAdmin: false },
      { name: '多级审核 / 会审', supplier: false, reviewer: true, systemAdmin: false },
      { name: '在线澄清沟通', supplier: true, reviewer: true, systemAdmin: false },
      { name: '审核结论判定（通过 / 驳回 / 有条件通过）', supplier: false, reviewer: true, systemAdmin: false },
      { name: '申诉复核处理', supplier: false, reviewer: true, systemAdmin: false },
    ],
  },
  {
    id: 'lifecycle',
    title: '全生命周期管理',
    items: [
      { name: '资质更新与重审触发', supplier: true, reviewer: false, systemAdmin: false },
      { name: '存量供应商信息导入', supplier: false, reviewer: true, systemAdmin: true },
      { name: '供应商状态冻结 / 解冻', supplier: false, reviewer: true, systemAdmin: true },
      { name: '预警通知接收', supplier: true, reviewer: true, systemAdmin: false },
      { name: '供应商档案检索', supplier: false, reviewer: true, systemAdmin: true },
    ],
  },
  {
    id: 'knowledge',
    title: '知识库',
    items: [
      { name: '审核指南与 FAQ 查阅', supplier: true, reviewer: true, systemAdmin: true },
      { name: '案例库查阅', supplier: true, reviewer: true, systemAdmin: true },
    ],
  },
  {
    id: 'system',
    title: '系统配置后台',
    items: [
      { name: '评分规则 / 模板配置', supplier: false, reviewer: false, systemAdmin: true },
      { name: '评分标准版本管理', supplier: false, reviewer: false, systemAdmin: true },
      { name: '供方类型与模板映射', supplier: false, reviewer: false, systemAdmin: true },
      { name: '外部接口参数配置', supplier: false, reviewer: false, systemAdmin: true },
      { name: '用户账号与权限管理', supplier: false, reviewer: false, systemAdmin: true },
    ],
  },
]

const EXTERNAL_INTERFACES = [
  {
    id: 'itf-001',
    name: '工商信息核验接口',
    code: 'business-registry',
    provider: '工商 Mock 数据服务',
    baseUrl: 'https://mock-registry.example.com/api/v1/enterprise',
    authType: 'AppKey + Secret',
    environment: '测试环境',
    timeoutSeconds: 8,
    enabled: true,
    autoRetry: true,
    ownerTeam: '主数据治理组',
    status: 'connected',
    lastCheckedAt: '2026-04-29T17:10:00',
    remark: '用于统一社会信用代码回填和主体信息核验。',
  },
  {
    id: 'itf-002',
    name: 'OCR 识别接口',
    code: 'ocr-engine',
    provider: '文档智能识别中心',
    baseUrl: 'https://mock-ocr.example.com/api/v2/recognize',
    authType: 'Bearer Token',
    environment: '测试环境',
    timeoutSeconds: 15,
    enabled: true,
    autoRetry: true,
    ownerTeam: '智能识别组',
    status: 'connected',
    lastCheckedAt: '2026-04-29T16:55:00',
    remark: '用于营业执照、体系证书、专利证书字段识别。',
  },
  {
    id: 'itf-003',
    name: '短信通知网关',
    code: 'sms-gateway',
    provider: '企业短信平台',
    baseUrl: 'https://mock-sms.example.com/api/send',
    authType: '签名 + 模板',
    environment: '测试环境',
    timeoutSeconds: 5,
    enabled: true,
    autoRetry: true,
    ownerTeam: '消息中心',
    status: 'connected',
    lastCheckedAt: '2026-04-29T18:00:00',
    remark: '用于风险通知、补件提醒和申诉进度回传。',
  },
  {
    id: 'itf-004',
    name: '证书验真平台',
    code: 'certificate-platform',
    provider: '资质验真平台',
    baseUrl: 'https://mock-cert.example.com/api/verify',
    authType: '双向证书',
    environment: '预发布环境',
    timeoutSeconds: 10,
    enabled: false,
    autoRetry: false,
    ownerTeam: '风控支撑组',
    status: 'pending',
    lastCheckedAt: '2026-04-28T14:30:00',
    remark: '计划用于外部证书真伪核验，目前仅保留参数。',
  },
  {
    id: 'itf-005',
    name: '同源关系图谱接口',
    code: 'graph-screening',
    provider: '风控图谱服务',
    baseUrl: 'https://mock-graph.example.com/api/v1/relations',
    authType: 'AppKey + IP 白名单',
    environment: '测试环境',
    timeoutSeconds: 12,
    enabled: true,
    autoRetry: false,
    ownerTeam: '风险策略组',
    status: 'warning',
    lastCheckedAt: '2026-04-29T13:15:00',
    remark: '用于同源主体命中和关联线索核验，当前偶发超时。',
  },
]

function connectionMeta(status) {
  return {
    connected: { label: '已连通', type: 'success' },
    warning: { label: '波动', type: 'warning' },
    pending: { label: '待接入', type: 'info' },
    offline: { label: '未连通', type: 'danger' },
  }[status] || { label: '未知', type: 'info' }
}

export const useAdminSettingsStore = defineStore('admin-settings', {
  state: () => ({
    adminAccounts: clone(MOCK_ADMINS),
    permissionSections: clone(PERMISSION_SECTIONS),
    externalInterfaces: clone(EXTERNAL_INTERFACES),
  }),
  getters: {
    reviewerAccounts: (state) => state.adminAccounts.filter((item) => item.role === 'reviewer'),
    systemAdminAccounts: (state) => state.adminAccounts.filter((item) => item.role === 'system-admin'),
    enabledInterfaceCount: (state) => state.externalInterfaces.filter((item) => item.enabled).length,
    permissionItemCount: (state) => state.permissionSections.reduce((sum, section) => sum + section.items.length, 0),
    normalizedInterfaces: (state) =>
      state.externalInterfaces.map((item) => ({
        ...item,
        connectionMeta: connectionMeta(item.status),
      })),
  },
  actions: {
    updateInterfaceConfig(interfaceId, payload) {
      const target = this.externalInterfaces.find((item) => item.id === interfaceId)
      if (!target) {
        throw new Error('未找到对应的接口配置。')
      }
      Object.assign(target, payload)
      return target
    },
    testInterfaceConnection(interfaceId) {
      const target = this.externalInterfaces.find((item) => item.id === interfaceId)
      if (!target) {
        throw new Error('未找到对应的接口配置。')
      }

      target.lastCheckedAt = new Date().toISOString()
      if (!target.enabled) {
        target.status = 'pending'
      } else if (target.code === 'graph-screening') {
        target.status = 'warning'
      } else {
        target.status = 'connected'
      }

      return {
        ...target,
        connectionMeta: connectionMeta(target.status),
      }
    },
  },
})
