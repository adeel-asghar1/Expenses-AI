import { useMemo, useState } from 'react'
import {
  FlatList, Pressable, RefreshControl, ScrollView, Text, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Receipt, ArrowDownUp, Trash2, Banknote,
} from 'lucide-react-native'

import type { Expense, Settlement } from '../../types'
import {
  useActiveGroup, useGroupData, useInvalidateGroup, queryKeys,
} from '../../hooks/useGroupData'
import { useSettings } from '../../state/settings'
import { useToast } from '../../state/toast'
import { deleteExpense, deleteSettlement } from '../../api'
import { formatMoney } from '../../lib/money'
import { dateLabel, dateTimeLabel } from '../../lib/dates'
import { playSound } from '../../lib/sounds'
import { haptic } from '../../lib/haptics'

import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { Chip } from '../../components/Chip'
import { EmptyState } from '../../components/EmptyState'
import { colors, radius, typography } from '../../design/tokens'

type Tab = 'expenses' | 'settlements'
type Row =
  | { key: string; kind: 'expense'; date: string; item: Expense }
  | { key: string; kind: 'settlement'; date: string; item: Settlement }

export default function ActivityScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { group } = useActiveGroup()
  const groupId = group?.id ?? null
  const { users, balances, expenses, settlements } = useGroupData(groupId)
  const invalidateGroup = useInvalidateGroup(groupId)

  const members = users.data ?? []
  const currency = balances.data?.currency ?? group?.currency ?? 'PKR'
  const showToast = useToast((s) => s.show)

  const [tab, setTab] = useState<Tab>('expenses')
  const [memberFilter, setMemberFilter] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null) // "expense-12" / "settlement-3"
  const [refreshing, setRefreshing] = useState(false)

  const nameFor = (id: number) => members.find((m) => m.id === id)?.name ?? 'Unknown'

  const onRefresh = async () => {
    if (groupId == null) return
    setRefreshing(true)
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: queryKeys.users(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.expenses(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.settlements(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.balances(groupId) }),
    ])
    setRefreshing(false)
  }

  const deleteMutation = useMutation({
    mutationFn: async (args: { kind: 'expense' | 'settlement'; id: number }) => {
      if (args.kind === 'expense') await deleteExpense(args.id)
      else await deleteSettlement(args.id)
    },
    onSuccess: (_data, args) => {
      invalidateGroup()
      setConfirming(null)
      showToast({
        kind: 'success',
        title: args.kind === 'expense' ? 'Expense deleted' : 'Settlement deleted',
        body: 'Balances recalculated on all phones.',
      })
      playSound('save')
      haptic.success()
    },
    onError: (error: Error) => {
      showToast({ kind: 'error', title: 'Not deleted', body: error.message })
      playSound('error')
      haptic.error()
    },
  })

  const rows = useMemo<Row[]>(() => {
    const matchMemberExpense = (e: Expense) =>
      memberFilter == null || e.paid_by === memberFilter || e.items.some((i) => i.owner_id === memberFilter)
    const matchMemberSettlement = (s: Settlement) =>
      memberFilter == null || s.from_user_id === memberFilter || s.to_user_id === memberFilter

    if (tab === 'expenses') {
      return (expenses.data ?? [])
        .filter(matchMemberExpense)
        .map((e) => ({ key: `expense-${e.id}`, kind: 'expense' as const, date: e.expense_date, item: e }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.item.id - a.item.id)
    }
    return (settlements.data ?? [])
      .filter(matchMemberSettlement)
      .map((s) => ({ key: `settlement-${s.id}`, kind: 'settlement' as const, date: String(s.settled_at ?? ''), item: s }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.item.id - a.item.id)
  }, [tab, memberFilter, expenses.data, settlements.data])

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'expense') {
      const e = item.item
      const confirmKey = `expense-${e.id}`
      const confirmingThis = confirming === confirmKey
      return (
        <Pressable
          onPress={() => router.push(`/expense/${e.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mintSoft, borderColor: colors.mintLine, borderWidth: 1 }}>
              <Receipt size={17} color={colors.mint} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13.5 }}>
                {e.description || 'Expense'}
              </Text>
              <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, marginTop: 2 }}>
                {nameFor(e.paid_by)} paid · {e.items.length} share{e.items.length === 1 ? '' : 's'} · {dateLabel(e.expense_date)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ color: colors.text, fontFamily: typography.bodySemi, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
                {formatMoney(e.total_amount, currency)}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => (confirmingThis ? deleteMutation.mutate({ kind: 'expense', id: e.id }) : setConfirming(confirmKey))}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: confirmingThis ? colors.coralSoft : 'transparent',
                  borderColor: confirmingThis ? colors.coral : 'transparent',
                  borderWidth: confirmingThis ? 1 : 0,
                  paddingHorizontal: confirmingThis ? 8 : 4,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                })}
              >
                {confirmingThis
                  ? <Text style={{ color: colors.coral, fontFamily: typography.bodySemi, fontSize: 10.5 }}>Confirm delete</Text>
                  : <Trash2 size={15} color={colors.coral} strokeWidth={1.8} />}
              </Pressable>
            </View>
          </View>
        </Pressable>
      )
    }

    const s = item.item
    const confirmKey = `settlement-${s.id}`
    const confirmingThis = confirming === confirmKey
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberSoft, borderColor: colors.amberLine, borderWidth: 1 }}>
          <ArrowDownUp size={17} color={colors.amber} strokeWidth={1.7} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13.5 }}>
            {nameFor(s.from_user_id)} paid {nameFor(s.to_user_id)}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11, marginTop: 2 }}>
            {dateTimeLabel(s.settled_at)}{s.note ? ` · ${s.note}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ color: colors.amber, fontFamily: typography.bodySemi, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
            {formatMoney(s.amount, currency)}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => (confirmingThis ? deleteMutation.mutate({ kind: 'settlement', id: s.id }) : setConfirming(confirmKey))}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: confirmingThis ? colors.coralSoft : 'transparent',
              borderColor: confirmingThis ? colors.coral : 'transparent',
              borderWidth: confirmingThis ? 1 : 0,
              paddingHorizontal: confirmingThis ? 8 : 4,
              paddingVertical: 4,
              borderRadius: radius.sm,
            })}
          >
            {confirmingThis
              ? <Text style={{ color: colors.coral, fontFamily: typography.bodySemi, fontSize: 10.5 }}>Confirm</Text>
              : <Trash2 size={15} color={colors.coral} strokeWidth={1.8} />}
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <Screen>
      <ScreenHeader flatName={group?.name} />
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <SectionHeader
          eyebrow="Flat ledger"
          title="Activity"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, borderColor: colors.line, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Banknote size={12} color={colors.mint} strokeWidth={2} />
              <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 11 }}>
                {rows.length} {tab === 'expenses' ? 'expense' : 'payment'}{rows.length === 1 ? '' : 's'}
              </Text>
            </View>
          }
        />

        {/* segmented control */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, borderColor: colors.line, borderWidth: 1, marginBottom: 10 }}>
          {([['expenses', 'Expenses'], ['settlements', 'Settlements']] as const).map(([key, label]) => {
            const active = tab === key
            return (
              <Pressable
                key={key}
                onPress={() => { setTab(key); setConfirming(null); haptic.selection() }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center',
                  backgroundColor: active ? colors.surfaceHighlight : 'transparent',
                  borderWidth: active ? 1 : 0, borderColor: colors.mintLine,
                }}
              >
                <Text style={{ color: active ? colors.mint : colors.textMuted, fontFamily: typography.bodySemi, fontSize: 12.5 }}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* member filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <Chip label="Everyone" selected={memberFilter == null} onPress={() => setMemberFilter(null)} />
          {members.map((m) => (
            <Chip key={m.id} label={m.name} selected={memberFilter === m.id} onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)} />
          ))}
        </ScrollView>

        {/* list */}
        <FlatList
          data={rows}
          renderItem={({ item }) => (
            <>
              {renderRow({ item })}
              <View style={{ height: 1, backgroundColor: colors.lineSoft, marginLeft: 54 }} />
            </>
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 26 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint} colors={[colors.mint]} />}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 'expenses' ? Receipt : ArrowDownUp}
              title={tab === 'expenses' ? 'No expenses yet' : 'No settlements yet'}
              body={tab === 'expenses'
                ? 'Describe one on the Ask AI tab and it will appear here.'
                : 'Record one from Balances → Settlement plan and it will appear here.'}
            />
          }
        />
      </View>
    </Screen>
  )
}
