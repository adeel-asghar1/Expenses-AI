/** WebSocket bridge: connects to the laptop backend for the current group.
 *  Frames are treated as "something changed" hints — the client refetches via REST. */
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import * as Notifications from 'expo-notifications'

import { wsUrlFor } from '../api/client'
import { useSettings } from '../state/settings'
import { useRealtimeStatus } from '../state/realtimeStatus'
import { useToast } from '../state/toast'
import { formatMoney } from '../lib/money'
import { playSound } from '../lib/sounds'
import { haptic } from '../lib/haptics'

export type RealtimeStatus = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'idle'

type Frame = {
  type?: string
  kind?: string
  ref_id?: number | null
  group_id?: number
  summary?: Record<string, unknown>
}

const frameKey = (f: Frame) => `${f.kind ?? '?'}:${f.ref_id ?? 0}`

function describeFrame(frame: Frame): { title: string; body: string } | null {
  const s = frame.summary ?? {}
  const text = (key: string) => (typeof s[key] === 'string' ? String(s[key]) : undefined)
  const currency = text('currency') ?? 'PKR'
  switch (frame.kind) {
    case 'expense_created':
      return {
        title: 'New expense',
        body: `${text('paid_by_name') ?? 'A flatmate'} paid ${formatMoney(text('amount') ?? '0', currency)}${text('description') ? ` · ${text('description')}` : ''}`,
      }
    case 'expense_deleted':
      return { title: 'Expense removed', body: `${text('description') ?? 'An expense'} was deleted` }
    case 'settlement_created':
      return {
        title: 'Settlement recorded',
        body: `${text('from_name') ?? 'Someone'} paid ${text('to_name') ?? 'someone'} ${formatMoney(text('amount') ?? '0', currency)}`,
      }
    case 'settlement_deleted':
      return { title: 'Settlement removed', body: `A settlement of ${formatMoney(text('amount') ?? '0', currency)} was deleted` }
    case 'user_added':
      return { title: 'Flatmate added', body: `${text('name') ?? 'Someone'} joined the flat` }
    case 'user_renamed':
      return { title: 'Flatmate renamed', body: `Now called ${text('name') ?? '?'}` }
    case 'user_removed':
      return { title: 'Flatmate removed', body: `${text('name') ?? 'Someone'} left the flat` }
    case 'group_created':
      return { title: 'New flat', body: `${text('group_name') ?? 'A flat'} was created` }
    default:
      return { title: 'Flat updated', body: 'Latest changes are available' }
  }
}

export function useRealtime(groupId: number | null | undefined): RealtimeStatus {
  const queryClient = useQueryClient()
  const apiUrl = useSettings((s) => s.apiUrl)
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled)
  const status = useRealtimeStatus((s) => s.status)
  const setStatus = (next: RealtimeStatus | ((current: RealtimeStatus) => RealtimeStatus)) =>
    useRealtimeStatus.setState((s) => ({
      status: typeof next === 'function' ? next(s.status) : next,
    }))
  const attemptRef = useRef(0)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const seenRef = useRef(new Map<string, number>())

  useEffect(() => {
    if (groupId == null) {
      setStatus('idle')
      return
    }

    let unmounted = false

    const clearTimers = () => {
      if (pingRef.current) clearInterval(pingRef.current)
      if (retryRef.current) clearTimeout(retryRef.current)
      pingRef.current = null
      retryRef.current = null
    }

    const handleFrame = (frame: Frame) => {
      // Dedupe: the backend emits one frame per committed mutation; guard against repeats.
      const key = frameKey(frame)
      const now = Date.now()
      const seen = seenRef.current
      for (const [k, t] of seen) if (now - t > 60000) seen.delete(k)
      if (seen.has(key)) return
      seen.set(key, now)

      // The backend (not the socket) is the data authority; refetch what changed.
      const invalidate = [
        ['balances', groupId],
        ['expenses', groupId],
        ['settlements', groupId],
      ]
      for (const queryKey of invalidate) queryClient.invalidateQueries({ queryKey })
      if (frame.kind === 'group_created') queryClient.invalidateQueries({ queryKey: ['groups'] })
      if (frame.kind?.startsWith('user_')) queryClient.invalidateQueries({ queryKey: ['users', groupId] })

      // Suppress the "you have a new notification" path right after this phone's own save.
      const isOwnMutation = now - useSettings.getState().lastMutationAt < 4000
      if (isOwnMutation) return

      const description = describeFrame(frame)
      if (!description) return

      const foreground = AppState.currentState === 'active'
      if (foreground) {
        useToast.getState().show({ kind: 'sync', ...description, actionLabel: 'View', actionTo: '/(tabs)/activity' })
        playSound('notify')
        haptic.light()
      } else if (notificationsEnabled) {
        Notifications.scheduleNotificationAsync({
          content: { title: description.title, body: description.body },
          trigger: null,
        }).catch(() => {})
      }
    }

    const connect = () => {
      if (unmounted) return
      setStatus((current) => (current === 'reconnecting' ? 'reconnecting' : 'connecting'))
      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrlFor(apiUrl, groupId))
      } catch {
        scheduleReconnect()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        if (unmounted) return
        attemptRef.current = 0
        setStatus('live')
        pingRef.current = setInterval(() => {
          try {
            ws.send('ping')
          } catch {
            /* socket closed; onclose will reconnect */
          }
        }, 25000)
      }

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data)) as Frame
          if (frame.type === 'connected' || frame.type === 'pong') return
          if (frame.type === 'data_changed') handleFrame(frame)
        } catch {
          /* ignore malformed frames */
        }
      }

      ws.onerror = () => {
        // onclose follows; nothing to do here
      }

      ws.onclose = () => {
        clearTimers()
        wsRef.current = null
        if (unmounted) return
        scheduleReconnect()
      }
    }

    const scheduleReconnect = () => {
      if (unmounted || retryRef.current) return
      setStatus('reconnecting')
      const attempt = attemptRef.current++
      const base = Math.min(30000, 1000 * 2 ** attempt)
      const delay = base + Math.floor(Math.random() * 500)
      retryRef.current = setTimeout(() => {
        retryRef.current = null
        connect()
      }, delay)
    }

    connect()

    const netInfoSub = NetInfo.addEventListener((state) => {
      if (state.isConnected === false) {
        clearTimers()
        setStatus('offline')
        try {
          wsRef.current?.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      } else if (state.isConnected === true && !wsRef.current) {
        attemptRef.current = 0
        connect()
      }
    })

    return () => {
      unmounted = true
      netInfoSub()
      clearTimers()
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }
  }, [groupId, apiUrl, notificationsEnabled, queryClient])

  return status
}
