import { createRouter, createWebHashHistory } from 'vue-router'
import { pinia } from '../stores'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/supplier/login',
    name: 'supplier-login',
    component: () => import('../views/supplier/SupplierLoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/AdminLoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/supplier',
    component: () => import('../layouts/SupplierLayout.vue'),
    meta: { requiresAuth: true, role: 'supplier' },
    children: [
      { path: '', redirect: '/supplier/overview' },
      { path: 'overview', name: 'supplier-overview', component: () => import('../views/supplier/SupplierOverviewView.vue') },
      { path: 'company', name: 'supplier-company', component: () => import('../views/supplier/CompanyProfileView.vue') },
      { path: 'upload', name: 'supplier-upload', component: () => import('../views/supplier/UploadCenterView.vue') },
      { path: 'results', name: 'supplier-results', component: () => import('../views/supplier/ResultCenterView.vue') },
      { path: 'appeals', name: 'supplier-appeals', component: () => import('../views/supplier/AppealCenterView.vue') },
      { path: 'records', name: 'supplier-records', component: () => import('../views/supplier/RecordListView.vue') },
      { path: 'records/:id', name: 'supplier-record-detail', component: () => import('../views/supplier/RecordDetailView.vue') },
      { path: 'help', name: 'supplier-help', component: () => import('../views/supplier/HelpCenterView.vue') },
    ],
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', redirect: '/admin/reviews' },
      { path: 'reviews', name: 'admin-reviews', component: () => import('../views/admin/ReviewListView.vue') },
      { path: 'reviews/:id', name: 'admin-review-detail', component: () => import('../views/admin/ReviewDetailView.vue') },
      { path: 'appeals', name: 'admin-appeals', component: () => import('../views/admin/AdminAppealWorkbenchView.vue') },
      { path: 'rereviews', name: 'admin-rereviews', component: () => import('../views/admin/RereviewWorkbenchView.vue') },
      { path: 'risk-radar', name: 'admin-risk-radar', component: () => import('../views/admin/RiskRadarView.vue') },
      { path: 'suppliers', name: 'admin-suppliers', component: () => import('../views/admin/SupplierManagementView.vue') },
      { path: 'standards', name: 'admin-standards', component: () => import('../views/admin/StandardManagementView.vue') },
      { path: 'permissions', name: 'admin-permissions', component: () => import('../views/admin/AdminPermissionManagementView.vue') },
      { path: 'logs', name: 'admin-logs', component: () => import('../views/admin/AuditLogView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return to.meta.role === 'admin' ? '/admin/login' : '/supplier/login'
  }

  if (to.meta.guestOnly && authStore.isLoggedIn) {
    return authStore.role === 'admin' ? '/admin/reviews' : '/supplier/overview'
  }

  if (to.meta.role && authStore.role && to.meta.role !== authStore.role) {
    return authStore.role === 'admin' ? '/admin/reviews' : '/supplier/overview'
  }

  return true
})

export default router
