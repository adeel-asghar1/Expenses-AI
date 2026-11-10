/** Pure draft-normalization and validation logic (kept UI-free for testing). */
import type { Draft, DraftItem } from '../types'
import { todayISO, isValidISODate } from './dates'
import { EPSILON, isValidAmount, sumAmounts } from './money'
import { requestId } from './id'

export type RawDraft = Record<string, unknown>

/** Map a raw /ai/parse-expense draft onto the editable shape used by the UI. */
export function normalizeDraft(raw: RawDraft, fallbackParticipantIds: number[]): Draft {
  const items = (Array.isArray(raw.items) ? (raw.items as RawDraft[]) : []).map((item): DraftItem => ({
    item_name: typeof item.item_name === 'string' ? item.item_name : '',
    owner_name: (item.owner_name as string | null | undefined) ?? null,
    owner_user_id: typeof item.owner_user_id === 'number' ? item.owner_user_id : null,
    owner_status: typeof item.owner_status === 'string' ? item.owner_status : 'unresolved',
    amount: item.amount != null ? String(item.amount) : '',
  }))
  return {
    description: typeof raw.description === 'string' ? raw.description : '',
    date: typeof raw.date === 'string' && raw.date ? raw.date : todayISO(),
    total_amount: raw.total_amount != null ? String(raw.total_amount) : '',
    paid_by_user_id: raw.paid_by_user_id != null ? String(raw.paid_by_user_id) : '',
    split_type: raw.split_type === 'items' ? 'items' : 'equal',
    participant_ids: Array.isArray(raw.participant_ids)
      ? (raw.participant_ids as unknown[]).filter((n): n is number => typeof n === 'number')
      : fallbackParticipantIds,
    items,
    issues: Array.isArray(raw.issues) ? (raw.issues as unknown[]).filter((i): i is string => typeof i === 'string') : [],
    needs_review: Boolean(raw.needs_review),
    allocations_total: raw.allocations_total != null ? String(raw.allocations_total) : '0.00',
    client_request_id: requestId(),
  }
}

/** First validation problem with a draft, or null when it can be submitted. Mirrors server rules. */
export function draftProblem(draft: Draft, memberIds: number[]): string | null {
  if (!isValidAmount(draft.total_amount)) return 'Enter a total amount greater than zero.'
  if (!draft.paid_by_user_id) return 'Select who paid.'
  if (!memberIds.includes(Number(draft.paid_by_user_id))) return 'The selected payer is not in this flat.'
  if (!isValidISODate(draft.date)) return 'Enter the date as YYYY-MM-DD.'
  if (draft.split_type === 'equal') {
    if (!draft.participant_ids.length) return 'Select at least one flatmate to split between.'
    return null
  }
  if (!draft.items.length) return 'Add at least one item with an amount.'
  for (let i = 0; i < draft.items.length; i++) {
    const item = draft.items[i]
    if (item.owner_user_id == null || !memberIds.includes(item.owner_user_id)) {
      return `Choose a flatmate for item ${i + 1}.`
    }
    if (!isValidAmount(item.amount)) return `Enter a valid amount for item ${i + 1}.`
  }
  const total = Number(draft.total_amount)
  const sum = sumAmounts(draft.items.map((i) => i.amount))
  if (Math.abs(sum - total) > EPSILON) {
    return `Item amounts add up to ${sum.toFixed(2)}, but the bill total is ${total.toFixed(2)}. Fix the amounts or switch to equal split.`
  }
  return null
}

/** Live "items vs total" state for the review banner. */
export function allocationCheck(draft: Draft): { sum: number; total: number; ok: boolean } {
  const total = Number(draft.total_amount)
  const sum = sumAmounts(draft.items.map((i) => i.amount))
  return { sum, total: Number.isFinite(total) ? total : 0, ok: Math.abs(sum - (Number.isFinite(total) ? total : 0)) <= EPSILON && total > 0 }
}
