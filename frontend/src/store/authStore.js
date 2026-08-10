import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/endpoints'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async ({ email, password }) => {
        set({ isLoading: true })
        try {
          const data = await authApi.login({ email, password })
          if (data.requires_2fa) {
            set({ isLoading: false })
            return { requires_2fa: true, pending_token: data.pending_token }
          }
          localStorage.setItem('token', data.token)
          set({ user: data.user, token: data.token, isLoading: false })
          return data.user
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      verifyTwoFactor: async ({ pending_token, code }) => {
        set({ isLoading: true })
        try {
          const data = await authApi.verifyTwoFactor({ pending_token, code })
          localStorage.setItem('token', data.token)
          set({ user: data.user, token: data.token, isLoading: false })
          return data.user
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },

      refreshUser: async () => {
        try {
          const data = await authApi.me()
          set({ user: data.user })
          return data.user
        } catch {
          get().logout()
          return null
        }
      },

      // Role helpers
      isAdmin: () => get().user?.role === 'admin',
      isHR: () => ['admin', 'hr_manager'].includes(get().user?.role),
      canManage: () => ['admin', 'hr_manager', 'department_head'].includes(get().user?.role),
    }),
    {
      name: 'quant-hr-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
