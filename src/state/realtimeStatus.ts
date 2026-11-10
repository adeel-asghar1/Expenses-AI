import { create } from 'zustand'
import type { RealtimeStatus } from '../hooks/useRealtime'

/** Written by useRealtime (single owner), read anywhere (headers). */
export const useRealtimeStatus = create<{ status: RealtimeStatus }>()(() => ({ status: 'idle' }))
