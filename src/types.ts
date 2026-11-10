/** Shared types mirroring the FastAPI backend contracts. */
export type Group = { id: number; name: string; currency: string }

export type Flatmate = { id: number; name: string; group_id: number }

export type ExpenseItem = {
  id: number
  owner_id: number
  item_name: string
  amount: string // JSON string, e.g. "1234.56" — never parse as flaky floats for display
}
export type Expense = {
  id: number
  group_id: number
  paid_by: number
  description: string | null
  total_amount: string
  expense_date: string // YYYY-MM-DD
  items: ExpenseItem[]
}

export type Settlement = {
  id: number
  group_id: number
  from_user_id: number
  to_user_id: number
  amount: string
  note: string | null
  settled_at: string // ISO datetime (naive, from SQLite)
}

export type BalanceRow = {
  user_id: number
  name: string
  net_balance: string
  paid_total: string
  consumed_total: string
}
export type Transfer = {
  from_user_id: number
  to_user_id: number
  from_name: string
  to_name: string
  amount: string
}
export type Balances = {
  group_id: number
  currency: string
  balances: BalanceRow[]
  suggested_transfers: Transfer[]
}

/** Editable AI draft as returned by POST /ai/parse-expense, normalized for the UI. */
export type DraftItem = {
  item_name: string
  owner_name: string | null
  owner_user_id: number | null
  owner_status: string
  amount: string
}
export type Draft = {
  description: string
  date: string
  total_amount: string
  paid_by_user_id: string
  split_type: 'equal' | 'items'
  participant_ids: number[]
  items: DraftItem[]
  issues: string[]
  needs_review: boolean
  allocations_total: string
  client_request_id: string
}

export type ExpenseCreateBody =
  | {
      group_id: number
      paid_by: number
      description: string
      expense_date: string
      total_amount: string
      split_equal_user_ids: number[]
      client_request_id: string
    }
  | {
      group_id: number
      paid_by: number
      description: string
      expense_date: string
      total_amount: string
      items: { owner_id: number; item_name: string; amount: string }[]
      client_request_id: string
    }

export type SettlementCreateBody = {
  group_id: number
  from_user_id: number
  to_user_id: number
  amount: string
  note: string | null
  client_request_id: string
}
