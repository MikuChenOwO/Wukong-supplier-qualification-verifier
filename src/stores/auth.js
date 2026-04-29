import { defineStore } from 'pinia'
import { MOCK_ADMINS } from '../constants/mockData'
import { useSuppliersStore } from './suppliers'

const adminList = JSON.parse(JSON.stringify(MOCK_ADMINS))

export const useAuthStore = defineStore('auth', {
  state: () => ({
    role: '',
    userId: '',
    displayName: '',
    adminRole: '',
    permissionCodes: [],
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userId && state.role),
  },
  actions: {
    loginSupplier(account, password) {
      const suppliersStore = useSuppliersStore()
      const supplier = suppliersStore.suppliers.find(
        (item) =>
          (item.account === account || item.enterprise.contactPhone === account) && item.password === password,
      )

      if (!supplier) {
        throw new Error('账号或密码错误，请使用文档中的 Mock 测试账号。')
      }

      this.role = 'supplier'
      this.userId = supplier.id
      this.displayName = supplier.enterprise.enterpriseName
      this.adminRole = ''
      this.permissionCodes = []
      return supplier
    },
    loginAdmin(account, password) {
      const admin = adminList.find((item) => item.account === account && item.password === password)
      if (!admin) {
        throw new Error('管理员账号或密码错误。')
      }

      this.role = 'admin'
      this.userId = admin.id
      this.displayName = admin.name
      this.adminRole = admin.role || ''
      this.permissionCodes = [...(admin.permissions || [])]
      return admin
    },
    registerAndLogin(form) {
      const suppliersStore = useSuppliersStore()
      if (suppliersStore.existsAccount(form.account)) {
        throw new Error('该登录账号已存在，请更换后再注册。')
      }

      const supplier = suppliersStore.registerSupplier(form)
      this.role = 'supplier'
      this.userId = supplier.id
      this.displayName = supplier.enterprise.enterpriseName
      this.adminRole = ''
      this.permissionCodes = []
      return supplier
    },
    logout() {
      this.role = ''
      this.userId = ''
      this.displayName = ''
      this.adminRole = ''
      this.permissionCodes = []
    },
    resetSupplierPasswordByPhone(phone, code, newPassword) {
      if (code !== '888888') {
        throw new Error('验证码错误，请输入 Mock 验证码 888888。')
      }

      const suppliersStore = useSuppliersStore()
      return suppliersStore.resetPasswordByPhone(phone, newPassword)
    },
  },
})
