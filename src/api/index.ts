/** Typed endpoint functions — one per route the app uses. */
import { apiRequest } from './client'
import type {
  Balances, Expense, ExpenseCreateBody, Group, Flatmate, Settlement, SettlementCreateBody,
} from '../types'

export type DraftsResponse = { drafts: Record<string, unknown>[]; requires_confirmation: boolean }

// system
export const getHealth = () => apiRequest<{ status: string }>('/health', { timeoutMs: 8000 })
export const getVersion = () =>
  apiRequest<{ name: string; version: string }>('/version', { timeoutMs: 8000 })

// groups & flatmates
export const listGroups = () => apiRequest<Group[]>('/groups')
export const createGroup = (name: string, currency = 'PKR') =>
  apiRequest<Group>('/groups', { method: 'POST', body: { name, currency } })
export const listUsers = (groupId: number) => apiRequest<Flatmate[]>(`/groups/${groupId}/users`)
export const addUser = (groupId: number, name: string) =>
  apiRequest<Flatmate>(`/groups/${groupId}/users`, { method: 'POST', body: { name } })
export const renameUser = (userId: number, name: string) =>
  apiRequest<Flatmate>(`/users/${userId}`, { method: 'PATCH', body: { name } })
export const removeUser = (userId: number) =>
  apiRequest<{ message: string }>(`/users/${userId}`, { method: 'DELETE' })

// expenses
export const getExpenses = (groupId: number) => apiRequest<Expense[]>(`/groups/${groupId}/expenses`)
export const createExpense = (body: ExpenseCreateBody) =>
  apiRequest<Expense>('/expenses', { method: 'POST', body })
export const deleteExpense = (expenseId: number) =>
  apiRequest<{ message: string }>(`/expenses/${expenseId}`, { method: 'DELETE' })

// balances
export const getBalances = (groupId: number) => apiRequest<Balances>(`/groups/${groupId}/balances`)

// settlements
export const getSettlements = (groupId: number) =>
  apiRequest<Settlement[]>(`/groups/${groupId}/settlements`)
export const createSettlement = (body: SettlementCreateBody) =>
  apiRequest<Settlement>('/settlements', { method: 'POST', body })
export const deleteSettlement = (settlementId: number) =>
  apiRequest<{ message: string }>(`/settlements/${settlementId}`, { method: 'DELETE' })

// AI
export const parseExpense = (input: { prompt: string; group_id: number; speaker_user_id: number | null }) =>
  apiRequest<DraftsResponse>('/ai/parse-expense', { method: 'POST', body: input, timeoutMs: 150000 })
