import { describe, it, expect } from 'vitest'
import { normalizeDraft, draftProblem, allocationCheck } from '../src/lib/drafts'

describe('normalizeDraft', () => {
  it('maps a well-formed live draft', () => {
    const d = normalizeDraft(
      {
        description: 'Groceries',
        date: '2026-11-10',
        total_amount: '3000.00',
        paid_by_user_id: 4,
        split_type: 'equal',
        participant_ids: [4, 5, 6],
        issues: [],
        needs_review: false,
        allocations_total: '0.00',
        items: [],
      },
      [4, 5, 6],
    )
    expect(d.description).toBe('Groceries')
    expect(d.paid_by_user_id).toBe('4')
    expect(d.participant_ids).toEqual([4, 5, 6])
    expect(d.client_request_id).toBeTruthy()
    expect(d.split_type).toBe('equal')
  })

  it('falls back to all members and today on missing pieces', () => {
    const d = normalizeDraft({}, [7, 8])
    expect(d.participant_ids).toEqual([7, 8])
    expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(d.total_amount).toBe('')
    expect(d.needs_review).toBe(false)
  })

  it('drops junk items and keeps string amounts', () => {
    const d = normalizeDraft(
      {
        split_type: 'items',
        items: [
          'nonsense',
          { item_name: 'Milk', owner_user_id: 4, amount: 250 },
          { item_name: 42, owner_user_id: 'x', amount: null },
        ],
      },
      [4],
    )
    expect(d.split_type).toBe('items')
    expect(d.items).toHaveLength(3)
    expect(d.items[1].amount).toBe('250')
    expect(d.items[1].owner_user_id).toBe(4)
    expect(d.items[2].owner_user_id).toBeNull()
    expect(d.items[2].owner_status).toBe('unresolved')
  })
})

describe('draftProblem', () => {
  const base = {
    description: 'x',
    date: '2026-11-10',
    total_amount: '100.00',
    paid_by_user_id: '4',
    split_type: 'equal' as const,
    participant_ids: [4],
    items: [],
    issues: [],
    needs_review: false,
    allocations_total: '0.00',
    client_request_id: 'id-1',
  }

  it('accepts a valid equal split', () => {
    expect(draftProblem(base, [4, 5])).toBeNull()
  })

  it('rejects missing total and bad date', () => {
    expect(draftProblem({ ...base, total_amount: '' }, [4, 5])).toMatch(/greater than zero/)
    expect(draftProblem({ ...base, date: 'yesterday' }, [4, 5])).toMatch(/YYYY-MM-DD/)
  })

  it('rejects an empty participant selection', () => {
    expect(draftProblem({ ...base, participant_ids: [] }, [4, 5])).toMatch(/at least one/)
  })

  it('rejects a payer not in the flat', () => {
    expect(draftProblem(base, [5, 6])).toMatch(/not in this flat/)
  })

  it('items mode requires real allocations that sum to the bill total', () => {
    const items = [
      { item_name: 'a', owner_name: 'Adeel', owner_user_id: 4, owner_status: 'matched', amount: '60.00' },
      { item_name: 'b', owner_name: 'Ahmed', owner_user_id: 5, owner_status: 'matched', amount: '40.00' },
    ]
    expect(draftProblem({ ...base, split_type: 'items', items }, [4, 5])).toBeNull()
    expect(
      draftProblem({ ...base, split_type: 'items', items: [{ ...items[0] }], total_amount: '100.00' }, [4, 5]),
    ).toMatch(/add up to/)
  })

  it('items mode flags missing owners and amounts', () => {
    const items = [
      { item_name: 'a', owner_name: null, owner_user_id: null, owner_status: 'missing', amount: '60.00' },
    ]
    expect(draftProblem({ ...base, split_type: 'items', items }, [4, 5])).toMatch(/Choose a flatmate/)
  })
})

describe('allocationCheck', () => {
  it('reports sums and ok state', () => {
    const d = {
      description: '', date: '2026-11-10', total_amount: '100.00', paid_by_user_id: '4',
      split_type: 'items' as const, participant_ids: [4, 5],
      items: [
        { item_name: 'a', owner_name: null, owner_user_id: 4, owner_status: 'matched', amount: '60' },
        { item_name: 'b', owner_name: null, owner_user_id: 5, owner_status: 'matched', amount: '40' },
      ],
      issues: [], needs_review: false, allocations_total: '100.00', client_request_id: 'id',
    }
    const check = allocationCheck(d)
    expect(check.sum).toBe(100)
    expect(check.total).toBe(100)
    expect(check.ok).toBe(true)
  })
})
