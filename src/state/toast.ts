/** Minimal toast notifications (top banner), driven by zustand + rendered once in the root. */
import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error' | 'sync'
export type Toast = { id: number; kind: ToastKind; title: string; body?: string; actionLabel?: string; actionTo?: string }

type ToastState = {
  toast: Toast | null
  show: (toast: Omit<Toast, 'id'>) => void
  dismiss: () => void
}

let counter = 0

export const useToast = create<ToastState>()((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: ++counter } }),
  dismiss: () => set({ toast: null }),
}))
