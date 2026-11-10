/** Shared query keys and group-scoped data helpers. */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSettings } from '../state/settings'
import { listGroups, listUsers, getBalances, getExpenses, getSettlements } from '../api'
import type { Group } from '../types'

export const queryKeys = {
  groups: ['groups'] as const,
  users: (groupId: number) => ['users', groupId] as const,
  balances: (groupId: number) => ['balances', groupId] as const,
  expenses: (groupId: number) => ['expenses', groupId] as const,
  settlements: (groupId: number) => ['settlements', groupId] as const,
}

export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: listGroups, staleTime: 30_000 })
}

/** Resolve the active flat: persisted selection, else the first flat. */
export function useActiveGroup() {
  const { data: groups, isLoading, isError, error, refetch, isFetching } = useGroups()
  const selectedGroupId = useSettings((s) => s.selectedGroupId)
  const setSelectedGroupId = useSettings((s) => s.setSelectedGroupId)

  const group: Group | null =
    groups?.find((g) => g.id === selectedGroupId) ?? groups?.[0] ?? null

  useEffect(() => {
    if (!groups) return
    if (group && selectedGroupId !== group.id) setSelectedGroupId(group.id)
    if (!group && !groups.length && selectedGroupId !== null) setSelectedGroupId(null)
  }, [groups, group, selectedGroupId, setSelectedGroupId])

  return { groups: groups ?? [], group, isLoading, isError, error, refetch, isFetching }
}

export function useGroupData(groupId: number | null | undefined) {
  const enabled = groupId != null
  const id = groupId ?? 0
  const users = useQuery({ queryKey: queryKeys.users(id), queryFn: () => listUsers(id), enabled, staleTime: 15_000 })
  const balances = useQuery({ queryKey: queryKeys.balances(id), queryFn: () => getBalances(id), enabled, staleTime: 15_000 })
  const expenses = useQuery({ queryKey: queryKeys.expenses(id), queryFn: () => getExpenses(id), enabled, staleTime: 15_000 })
  const settlements = useQuery({ queryKey: queryKeys.settlements(id), queryFn: () => getSettlements(id), enabled, staleTime: 15_000 })
  return { users, balances, expenses, settlements }
}

/** Invalidate everything about one flat after a mutation. */
export function useInvalidateGroup(groupId: number | null | undefined) {
  const queryClient = useQueryClient()
  return () => {
    if (groupId == null) return
    queryClient.invalidateQueries({ queryKey: queryKeys.users(groupId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.balances(groupId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses(groupId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements(groupId) })
  }
}
