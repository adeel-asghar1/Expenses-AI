import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native'
import {
  CheckCircle2, ArrowRight, Scale, ShieldCheck, ArrowDownUp,
} from 'lucide-react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  useActiveGroup, useGroupData, useInvalidateGroup, queryKeys,
} from '../../hooks/useGroupData'
import { useSettings } from '../../state/settings'
import { useToast } from '../../state/toast'
import { createSettlement } from '../../api'
import { formatMoney, formatSignedMoney, isValidAmount, toApiAmount, EPSILON } from '../../lib/money'
import { playSound } from '../../lib/sounds'
import { haptic } from '../../lib/haptics'

import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Chip } from '../../components/Chip'
import { BalanceRow } from '../../components/BalanceRow'
import { GradientButton } from '../../components/GradientButton'
import { colors, radius, spacing, typography } from '../../design/tokens'
import { fieldLabel, inputStyle } from '../../design/styles'

export default function BalancesScreen() {
  const { group } = useActiveGroup()
  const groupId = group?.id ?? null
  const queryClient = useQueryClient()
  const { users, balances, expenses, settlements } = useGroupData(groupId)
  const invalidateGroup = useInvalidateGroup(groupId)

  const members = users.data ?? []
  const currency = balances.data?.currency ?? group?.currency ?? 'PKR'
  const identityId = useSettings((s) => (groupId != null ? s.identities[groupId] : undefined))
  const markMutation = useSettings((s) => s.markMutation)
  const showToast = useToast((s) => s.show)

  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [fromId, setFromId] = useState<number | null>(null)
  const [toId, setToId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const onRefresh = async () => {
    if (groupId == null) return
    setRefreshing(true)
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: queryKeys.users(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.balances(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.expenses(groupId) }),
      queryClient.refetchQueries({ queryKey: queryKeys.settlements(groupId) }),
    ])
    setRefreshing(false)
  }

  const openPrefilled = (from: number, to: number, presetAmount?: string) => {
    setFromId(from)
    setToId(to)
    setAmount(presetAmount ?? '')
    setNote('')
    setModalOpen(true)
  }

  const nameFor = (id: number) => members.find((m) => m.id === id)?.name ?? 'Unknown'

  const myBalance = balances.data?.balances.find((b) => b.user_id === identityId) ?? null
  const myNet = myBalance ? Number(myBalance.net_balance) : 0
  const netSum = (balances.data?.balances ?? []).reduce((sum, b) => sum + Number(b.net_balance), 0)
  const suggestions = balances.data?.suggested_transfers ?? []

  const settleMutation = useMutation({
    mutationFn: () =>
      createSettlement({
        group_id: groupId as number,
        from_user_id: fromId as number,
        to_user_id: toId as number,
        amount: toApiAmount(amount),
        note: note.trim() || null,
        client_request_id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      }),
    onMutate: () => markMutation(),
    onSuccess: () => {
      invalidateGroup()
      setModalOpen(false)
      showToast({ kind: 'success', title: 'Settlement recorded', body: 'Balances updated on all phones.' })
      playSound('save')
      haptic.success()
    },
    onError: (error: Error) => {
      showToast({ kind: 'error', title: 'Not saved', body: error.message })
      playSound('error')
      haptic.error()
    },
  })

  const canSubmit = fromId != null && toId != null && fromId !== toId && isValidAmount(amount)

  const heroLine = !identityId
    ? 'Select who you are in Settings → Identity'
    : Math.abs(myNet) <= EPSILON
      ? 'All square — nothing to settle'
      : myNet > 0
        ? 'You are owed'
        : 'You owe'

  useEffect(() => {
    if (!modalOpen || fromId != null) return
    if (identityId) setFromId(identityId)
  }, [modalOpen, fromId, identityId])

  const memberRows = (balances.data?.balances ?? []).slice().sort(
    (a, b) => Number(b.net_balance) - Number(a.net_balance),
  )

  return (
    <Screen>
      <ScreenHeader flatName={group?.name} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 18 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint} colors={[colors.mint]} />}
        >
          {/* hero: my position */}
          <Card raised style={{ overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 5, backgroundColor: myNet >= 0 ? colors.mint : colors.coral, opacity: 0.9 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textFaint, fontFamily: typography.bodySemi, fontSize: 10, letterSpacing: 1.6 }}>
                {heroLine === 'All square — nothing to settle' ? 'STATUS' : 'BALANCE'}
              </Text>
              <Scale size={18} color={colors.mint} strokeWidth={1.6} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  flexShrink: 1, color: myNet > EPSILON ? colors.good : myNet < -EPSILON ? colors.coral : colors.text,
                  fontFamily: typography.displayBold, fontSize: 30, fontVariant: ['tabular-nums'],
                }}
              >
                {identityId && myBalance ? formatSignedMoney(myBalance.net_balance, currency) : '—'}
              </Text>
              {myBalance && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.textFaint, fontSize: 10, fontFamily: typography.body, letterSpacing: 1 }}>PAID</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: typography.bodySemi, fontSize: 12, fontVariant: ['tabular-nums'] }}>{formatMoney(myBalance.paid_total, currency)}</Text>
                  <Text style={{ color: colors.textFaint, fontSize: 10, fontFamily: typography.body, letterSpacing: 1, marginTop: 6 }}>CONSUMED</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: typography.bodySemi, fontSize: 12, fontVariant: ['tabular-nums'] }}>{formatMoney(myBalance.consumed_total, currency)}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 11.5, marginTop: 8 }}>
              {heroLine}
            </Text>
          </Card>

          {/* members */}
          <View>
            <SectionHeader eyebrow="Current position" title="Everyone's balances" />
            <Card style={{ paddingVertical: 6 }}>
              {memberRows.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontFamily: typography.body, paddingVertical: 14, textAlign: 'center' }}>
                  Add flatmates in Settings to see balances.
                </Text>
              ) : (
                <>
                  {memberRows.map((b, index) => (
                    <View
                      key={b.user_id}
                      style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.lineSoft }}
                    >
                      <BalanceRow
                        name={b.name}
                        net={b.net_balance}
                        paid={b.paid_total}
                        consumed={b.consumed_total}
                        currency={currency}
                        index={index}
                        highlight={b.user_id === identityId}
                      />
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 4 }}>
                    <ShieldCheck size={14} color={Math.abs(netSum) <= EPSILON ? colors.good : colors.amber} strokeWidth={2} />
                    <Text style={{ color: Math.abs(netSum) <= EPSILON ? colors.good : colors.amber, fontFamily: typography.bodyMedium, fontSize: 11.5 }}>
                      {Math.abs(netSum) <= EPSILON ? 'Balances add up to 0.00 — internally consistent.' : `Balances sum to ${netSum.toFixed(2)} — check expenses.`}
                    </Text>
                  </View>
                </>
              )}
            </Card>
          </View>

          {/* settlement suggestions */}
          <View>
            <SectionHeader eyebrow="Settlement plan" title="Who pays whom?" />
            <Card style={{ gap: 12 }}>
              {suggestions.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 10, gap: 8 }}>
                  <CheckCircle2 size={26} color={colors.mint} strokeWidth={1.5} />
                  <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12.5, textAlign: 'center' }}>
                    Nothing outstanding. When someone pays for others, suggested transfers appear here.
                  </Text>
                </View>
              ) : (
                <>
                  {suggestions.map((t, i) => (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.lineSoft, paddingTop: i === 0 ? 0 : 12 }}
                    >
                      <Avatar name={t.from_name} size={32} />
                      <ArrowRight size={15} color={colors.mint} strokeWidth={2} />
                      <Avatar name={t.to_name} size={32} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.bodyMedium, fontSize: 12 }}>
                          {t.from_name} → {t.to_name}
                        </Text>
                        <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 11.5, fontVariant: ['tabular-nums'] }}>
                          {formatMoney(t.amount, currency)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openPrefilled(t.from_user_id, t.to_user_id, t.amount)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1, paddingHorizontal: 12, paddingVertical: 8,
                          borderRadius: radius.pill, borderWidth: 1, borderColor: colors.mintLine, backgroundColor: colors.mintSoft,
                        })}
                      >
                        <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 11.5 }}>Record</Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              )}
              <Pressable
                onPress={() =>
                  members.length >= 2
                    ? openPrefilled(fromId ?? identityId ?? members[0]?.id ?? 0, toId ?? members[1]?.id ?? members[0]?.id ?? 0)
                    : showToast({ kind: 'info', title: 'Add flatmates first', body: 'You need at least two flatmates in the flat to record a settlement.' })
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'center', paddingVertical: 10 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ArrowDownUp size={15} color={colors.textMuted} strokeWidth={1.8} />
                  <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 13 }}>
                    Record a different payment…
                  </Text>
                </View>
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---- Record settlement sheet ---- */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,6,14,0.72)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setModalOpen(false)} accessibilityLabel="Close" />
          <View
            style={{
              backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              borderColor: colors.line, borderTopWidth: 1, padding: 20, paddingBottom: 34, gap: 14,
            }}
          >
            <View style={{ alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.surfaceHighlight, marginBottom: 4 }} />
            <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 19 }}>Record payment</Text>

            <View>
              <Text style={fieldLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {members.map((m) => (
                  <Chip key={m.id} label={m.name} selected={fromId === m.id} onPress={() => setFromId(m.id)} />
                ))}
              </ScrollView>
            </View>
            <View>
              <Text style={fieldLabel}>To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {members.map((m) => (
                  <Chip key={m.id} label={m.name} selected={toId === m.id} onPress={() => setToId(m.id)} />
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={fieldLabel}>Amount ({currency})</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(',', '.'))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={[inputStyle, { fontVariant: ['tabular-nums'] }]}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={fieldLabel}>Note (optional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. electricity"
                  placeholderTextColor={colors.textFaint}
                  maxLength={250}
                  style={inputStyle}
                />
              </View>
            </View>

            {fromId != null && fromId === toId ? (
              <Text style={{ color: colors.coral, fontFamily: typography.bodyMedium, fontSize: 12 }}>
                Payer and receiver must be different flatmates.
              </Text>
            ) : null}

            <GradientButton
              label={settleMutation.isPending ? 'Saving…' : 'Record settlement'}
              loading={settleMutation.isPending}
              disabled={!canSubmit}
              onPress={() => canSubmit && settleMutation.mutate()}
            />
            <Pressable hitSlop={8} onPress={() => setModalOpen(false)} style={{ alignSelf: 'center', paddingVertical: 6 }}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 13 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
