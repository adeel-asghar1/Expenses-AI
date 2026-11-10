import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, Receipt, User, CalendarDays, Trash2, Users } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { useActiveGroup, useGroupData, useInvalidateGroup } from '../../hooks/useGroupData'
import { useSettings } from '../../state/settings'
import { useToast } from '../../state/toast'
import { deleteExpense } from '../../api'
import { formatMoney } from '../../lib/money'
import { dateLabel } from '../../lib/dates'
import { playSound } from '../../lib/sounds'
import { haptic } from '../../lib/haptics'

import { Screen } from '../../components/Screen'
import { SectionHeader } from '../../components/SectionHeader'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { colors, radius, spacing, typography } from '../../design/tokens'

export default function ExpenseDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { group } = useActiveGroup()
  const groupId = group?.id ?? null
  const { users, expenses, balances } = useGroupData(groupId)
  const invalidateGroup = useInvalidateGroup(groupId)
  const markMutation = useSettings((s) => s.markMutation)
  const showToast = useToast((s) => s.show)
  const [confirming, setConfirming] = useState(false)

  const members = users.data ?? []
  const currency = balances.data?.currency ?? group?.currency ?? 'PKR'
  const expense = expenses.data?.find((e) => e.id === Number(id))
  const nameFor = (userId: number) => members.find((m) => m.id === userId)?.name ?? 'Unknown'

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(Number(id)),
    onMutate: () => markMutation(),
    onSuccess: () => {
      invalidateGroup()
      showToast({ kind: 'success', title: 'Expense deleted', body: 'Balances recalculated on all phones.' })
      playSound('save')
      haptic.success()
      router.back()
    },
    onError: (error: Error) => {
      showToast({ kind: 'error', title: 'Not deleted', body: error.message })
      playSound('error')
      haptic.error()
    },
  })

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
          <Pressable hitSlop={10} onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
            <ChevronLeft size={26} color={colors.text} strokeWidth={1.8} />
          </Pressable>
          <Text style={{ color: colors.textFaint, fontFamily: typography.bodySemi, fontSize: 10.5, letterSpacing: 1.6 }}>
            EXPENSE DETAIL
          </Text>
        </View>

        {!expense ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 12 }}>
            <Receipt size={38} color={colors.textFaint} strokeWidth={1.4} />
            <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 19, textAlign: 'center' }}>
              Expense not found
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 13, textAlign: 'center' }}>
              It may have been deleted from another phone.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
            {/* identity block */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontFamily: typography.displayBold, fontSize: 25, lineHeight: 31 }}>
                {expense.description || 'Expense'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={14} color={colors.textFaint} strokeWidth={1.8} />
                  <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12.5 }}>
                    {dateLabel(expense.expense_date)} · {expense.expense_date}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <User size={14} color={colors.textFaint} strokeWidth={1.8} />
                  <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12.5 }}>
                    {nameFor(expense.paid_by)} paid
                  </Text>
                </View>
              </View>
            </View>

            {/* amount hero */}
            <LinearGradient
              colors={['#22352F', '#181B33']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: radius.xl, padding: 18, borderWidth: 1, borderColor: colors.mintLine }}
            >
              <Text style={{ color: colors.textFaint, fontFamily: typography.bodySemi, fontSize: 10, letterSpacing: 1.6 }}>
                TOTAL
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: colors.mint, fontFamily: typography.displayBold, fontSize: 34, fontVariant: ['tabular-nums'], marginTop: 4 }}
              >
                {formatMoney(expense.total_amount, currency)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Users size={13} color={colors.textFaint} strokeWidth={1.8} />
                <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12 }}>
                  Split between {expense.items.length} flatmate{expense.items.length === 1 ? '' : 's'}
                </Text>
              </View>
            </LinearGradient>

            {/* allocation bars */}
            <View>
              <SectionHeader eyebrow="Who consumed what" />
              <Card style={{ gap: 14 }}>
                {expense.items.map((item) => {
                  const share = Number(item.amount)
                  const total = Number(expense.total_amount)
                  const widthPct = total > 0 ? Math.max(4, (share / total) * 100) : 0
                  return (
                    <View key={item.id} style={{ gap: 7 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Avatar name={nameFor(item.owner_id)} size={30} />
                        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: typography.bodyMedium, fontSize: 13 }}>
                          {nameFor(item.owner_id)}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontFamily: typography.bodySemi, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
                          {formatMoney(item.amount, currency)}
                        </Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceHighlight, overflow: 'hidden', marginLeft: 40 }}>
                        <LinearGradient
                          colors={['#7CF2C4', '#2BD4BF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ height: 8, width: `${widthPct}%`, borderRadius: 4 }}
                        />
                      </View>
                    </View>
                  )
                })}
              </Card>
            </View>

            {/* delete */}
            <Pressable
              onPress={() => (confirming ? deleteMutation.mutate() : setConfirming(true))}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: radius.pill, borderWidth: 1, paddingVertical: 14,
                borderColor: colors.coral,
                backgroundColor: confirming ? colors.coral : 'transparent',
              })}
            >
              <Trash2 size={17} color={confirming ? '#3A0A07' : colors.coral} strokeWidth={2} />
              <Text
                style={{
                  color: confirming ? '#3A0A07' : colors.coral,
                  fontFamily: typography.bodySemi,
                  fontSize: 13.5,
                }}
              >
                {deleteMutation.isPending ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete expense'}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Screen>
  )
}
