import { SAMPLE_PDF_DATA_URI, createInlineImage } from '../utils/preview'

export const SUPPLIER_TYPES = [
  { label: '原材料 / 外协外包类', value: 'raw' },
  { label: '配套件类', value: 'parts' },
  { label: '中间商类', value: 'trade' },
  { label: '技术合作类', value: 'tech' },
  { label: '运输类', value: 'transport' },
  { label: '其他类', value: 'other' },
]

export const PRODUCT_LEVELS = [
  { label: 'A 类产品', value: 'A' },
  { label: 'B 类产品', value: 'B' },
  { label: 'C 类产品', value: 'C' },
]

export const DOCUMENT_TYPES = [
  { label: '营业执照', value: 'business-license', accept: '.pdf,.png,.jpg,.jpeg' },
  { label: '质量管理体系证书', value: 'quality-system', accept: '.pdf,.png,.jpg,.jpeg' },
  { label: '行业强制认证', value: 'industry-cert', accept: '.pdf,.png,.jpg,.jpeg' },
  { label: '专利证书', value: 'patent-cert', accept: '.pdf,.png,.jpg,.jpeg' },
  { label: '其他资质', value: 'other', accept: '.pdf,.png,.jpg,.jpeg' },
]

export const STANDARD_FIELD_LIBRARY = {
  'business-license': ['企业名称', '统一社会信用代码', '法人', '证书有效期'],
  'quality-system': ['企业名称', '统一社会信用代码', '认证范围', '证书有效期'],
  'industry-cert': ['企业名称', '统一社会信用代码', '认证范围', '证书有效期'],
  'patent-cert': ['企业名称', '统一社会信用代码', '专利名称', '证书有效期'],
  other: ['企业名称', '统一社会信用代码', '证书有效期'],
}

export const THRESHOLD_MATRIX = {
  A: 90,
  B: 85,
  C: 80,
  tech: 85,
  transport: 80,
  other: 80,
}

export const MOCK_BUSINESS_REGISTRY = [
  {
    creditCode: '91440300MA5F8P2K2M',
    enterpriseName: '悟空精工（深圳）有限公司',
    legalPerson: '孙行者',
    registerAddress: '深圳市南山区智造大道 88 号',
    status: '存续',
  },
  {
    creditCode: '91310000MA1K0A2B6Q',
    enterpriseName: '筋斗云供应链科技（上海）有限公司',
    legalPerson: '敖烈',
    registerAddress: '上海市浦东新区云腾路 18 号',
    status: '存续',
  },
]

export const STANDARD_TEMPLATES = [
  {
    id: 'std-raw-a-v3',
    name: '原材料/外协外包 A 类准入模板',
    version: 'V3.2',
    supplierType: 'raw',
    productLevel: 'A',
    status: '启用',
    threshold: 90,
    weights: {
      quality: 0.4,
      technical: 0.35,
      business: 0.25,
      bonusMax: 5,
    },
    vetoRules: ['技术能力不满足直接否决'],
  },
  {
    id: 'std-parts-b-v2',
    name: '配套件 B 类准入模板',
    version: 'V2.4',
    supplierType: 'parts',
    productLevel: 'B',
    status: '启用',
    threshold: 85,
    weights: {
      quality: 0.38,
      technical: 0.37,
      business: 0.25,
      bonusMax: 5,
    },
    vetoRules: ['设计能力或技术文件不满足直接否决'],
  },
  {
    id: 'std-tech-v1',
    name: '技术合作类通用模板',
    version: 'V1.8',
    supplierType: 'tech',
    productLevel: 'B',
    status: '启用',
    threshold: 85,
    weights: {
      quality: 0.3,
      technical: 0.45,
      business: 0.25,
      bonusMax: 5,
    },
    vetoRules: [],
  },
]

export const KNOWLEDGE_BASE = [
  {
    id: 'faq-1',
    title: '证书过期后为什么会自动标记高风险？',
    summary: '悟空会在机器预审阶段检查有效期，过期证书会直接加入风险列表并下调预审得分。',
  },
  {
    id: 'faq-2',
    title: '为什么未通过的文件不能直接改状态？',
    summary: '需求规定未通过文件必须重新上传，保留历史记录可审计，避免审核轨迹被覆盖。',
  },
  {
    id: 'faq-3',
    title: '管理员可以修改供应商原始资料吗？',
    summary: '不可以。管理员只能审核和填写意见，原始资料与文件始终由供应商维护。',
  },
]

export const MOCK_SUPPLIERS = [
  {
    id: 'sup-001',
    account: 'supplier01',
    password: '123456',
    registeredAt: '2026-01-06T10:00:00',
    enterprise: {
      enterpriseName: '悟空精工（深圳）有限公司',
      creditCode: '91440300MA5F8P2K2M',
      legalPerson: '孙行者',
      contactName: '唐小白',
      contactPhone: '13800138000',
      registerAddress: '深圳市南山区智造大道 88 号',
      productionAddress: '深圳市宝安区智造园 6 栋',
      foundedAt: '2018-05-12',
      registeredCapital: '3000 万人民币',
      businessScope: '精密零件加工、机加工件制造、供应链协同服务',
      supplierType: 'raw',
      productLevel: 'A',
      templateId: 'std-raw-a-v3',
      greenCertified: true,
    },
    teamMembers: [
      { name: '孙行者', role: '法人', idNo: '440301198901013216' },
      { name: '猪小能', role: '质量负责人', idNo: '440301198711126812' },
    ],
    relatedParties: [
      { name: '孙行者', relation: '法人', idNo: '440301198901013216' },
      { name: '敖烈', relation: '战略股东', idNo: '310101198805150021' },
    ],
    changeHistory: [
      {
        id: 'chg-001',
        at: '2026-03-02T09:20:00',
        field: '生产地址',
        from: '深圳市宝安区旧厂房 2 号',
        to: '深圳市宝安区智造园 6 栋',
      },
    ],
  },
  {
    id: 'sup-002',
    account: 'cloud02',
    password: '123456',
    registeredAt: '2026-02-15T09:30:00',
    enterprise: {
      enterpriseName: '筋斗云供应链科技（上海）有限公司',
      creditCode: '91310000MA1K0A2B6Q',
      legalPerson: '敖烈',
      contactName: '白小龙',
      contactPhone: '13922334455',
      registerAddress: '上海市浦东新区云腾路 18 号',
      productionAddress: '上海市嘉定区智联产业园 9 号',
      foundedAt: '2019-09-18',
      registeredCapital: '1500 万人民币',
      businessScope: '供应链服务、物流方案、配套件采购',
      supplierType: 'parts',
      productLevel: 'B',
      templateId: 'std-parts-b-v2',
      greenCertified: false,
    },
    teamMembers: [
      { name: '敖烈', role: '法人', idNo: '310101198805150021' },
      { name: '白小龙', role: '商务负责人', idNo: '310101199105083613' },
    ],
    relatedParties: [{ name: '敖烈', relation: '法人', idNo: '310101198805150021' }],
    changeHistory: [],
  },
]

export const MOCK_ADMINS = [
  {
    id: 'adm-001',
    account: 'admin',
    password: 'admin123',
    name: '采购审核员-金箍',
    role: 'super-admin',
    permissions: ['review', 'logs', 'suppliers', 'standards'],
  },
]

export const MOCK_REVIEW_LOGS = [
  {
    id: 'log-001',
    recordId: 'doc-001',
    taskNo: 'WK-202604-0001',
    supplierName: '悟空精工（深圳）有限公司',
    fileName: '营业执照-最新版.pdf',
    reviewer: '采购审核员-金箍',
    action: '审核通过',
    result: '已通过',
    score: 94,
    comment: '证照信息完整，企业信息与工商库一致。',
    reviewedAt: '2026-04-03T14:20:00',
  },
]

export const MOCK_DOCUMENTS = [
  {
    id: 'doc-001',
    taskNo: 'WK-202604-0001',
    supplierId: 'sup-001',
    fileName: '营业执照-最新版.pdf',
    category: 'business-license',
    mimeType: 'application/pdf',
    sizeMB: 2.6,
    uploadedAt: '2026-04-03T11:18:00',
    status: 'approved',
    machineStatus: 'pass',
    previewUrl: SAMPLE_PDF_DATA_URI,
    standardTemplateId: 'std-raw-a-v3',
    extractedFields: {
      enterpriseName: '悟空精工（深圳）有限公司',
      creditCode: '91440300MA5F8P2K2M',
      legalPerson: '孙行者',
      validUntil: '2029-12-31',
      certificationScope: '企业主体经营资格',
    },
    comparisons: [
      { field: '企业名称', expected: '悟空精工（深圳）有限公司', actual: '悟空精工（深圳）有限公司', result: '匹配' },
      { field: '统一社会信用代码', expected: '91440300MA5F8P2K2M', actual: '91440300MA5F8P2K2M', result: '匹配' },
      { field: '法人', expected: '孙行者', actual: '孙行者', result: '匹配' },
      { field: '证书有效期', expected: '有效', actual: '2029-12-31', result: '匹配' },
    ],
    riskFlags: [],
    precheckScore: 94,
    scoreBreakdown: { quality: 93, technical: 92, business: 94, bonus: 4, total: 94 },
    sameSourceMatches: [{ matchedCompany: '筋斗云供应链科技（上海）有限公司', person: '敖烈', relation: '战略股东', riskLevel: '中' }],
    adminOpinion: '证照真实有效，通过。',
    reviewerName: '采购审核员-金箍',
    reviewedAt: '2026-04-03T14:20:00',
  },
  {
    id: 'doc-002',
    taskNo: 'WK-202604-0002',
    supplierId: 'sup-001',
    fileName: '质量体系证书-2026版.pdf',
    category: 'quality-system',
    mimeType: 'application/pdf',
    sizeMB: 3.2,
    uploadedAt: '2026-04-15T09:42:00',
    status: 'pending',
    machineStatus: 'warning',
    previewUrl: SAMPLE_PDF_DATA_URI,
    standardTemplateId: 'std-raw-a-v3',
    extractedFields: {
      enterpriseName: '悟空精工（深圳）有限公司',
      creditCode: '91440300MA5F8P2K2M',
      legalPerson: '孙行者',
      validUntil: '2026-05-20',
      certificationScope: '机加工件质量管理体系',
    },
    comparisons: [
      { field: '企业名称', expected: '悟空精工（深圳）有限公司', actual: '悟空精工（深圳）有限公司', result: '匹配' },
      { field: '统一社会信用代码', expected: '91440300MA5F8P2K2M', actual: '91440300MA5F8P2K2M', result: '匹配' },
      { field: '认证范围', expected: '应覆盖机加工件制造', actual: '机加工件质量管理体系', result: '待确认' },
      { field: '证书有效期', expected: '有效', actual: '2026-05-20', result: '待确认' },
    ],
    riskFlags: ['证书接近到期', '认证范围需要人工确认'],
    precheckScore: 87,
    scoreBreakdown: { quality: 85, technical: 89, business: 86, bonus: 4, total: 87 },
    sameSourceMatches: [{ matchedCompany: '筋斗云供应链科技（上海）有限公司', person: '敖烈', relation: '战略股东', riskLevel: '中' }],
    adminOpinion: '',
    reviewerName: '',
    reviewedAt: '',
  },
  {
    id: 'doc-003',
    taskNo: 'WK-202604-0003',
    supplierId: 'sup-002',
    fileName: '专利证书-信息不一致.png',
    category: 'patent-cert',
    mimeType: 'image/png',
    sizeMB: 1.1,
    uploadedAt: '2026-04-12T13:15:00',
    status: 'rejected',
    machineStatus: 'fail',
    previewUrl: createInlineImage('专利证书-信息不一致', '#c33f22'),
    standardTemplateId: 'std-parts-b-v2',
    extractedFields: {
      enterpriseName: '筋斗云供应链科技（上海）有限公司（旧）',
      creditCode: '91310000MA1K0A2B6Q',
      legalPerson: '敖烈',
      validUntil: '2027-12-01',
      certificationScope: '配套件结构优化专利',
    },
    comparisons: [
      { field: '企业名称', expected: '筋斗云供应链科技（上海）有限公司', actual: '筋斗云供应链科技（上海）有限公司（旧）', result: '不匹配' },
      { field: '统一社会信用代码', expected: '91310000MA1K0A2B6Q', actual: '91310000MA1K0A2B6Q', result: '匹配' },
      { field: '专利名称', expected: '需与技术申报一致', actual: '配套件结构优化专利', result: '待确认' },
      { field: '证书有效期', expected: '有效', actual: '2027-12-01', result: '匹配' },
    ],
    riskFlags: ['企业名称与工商登记不一致'],
    precheckScore: 72,
    scoreBreakdown: { quality: 70, technical: 74, business: 72, bonus: 0, total: 72 },
    sameSourceMatches: [],
    adminOpinion: '企业名称与登记信息不一致，请重新上传最新证书。',
    reviewerName: '采购审核员-金箍',
    reviewedAt: '2026-04-12T16:05:00',
  },
]
